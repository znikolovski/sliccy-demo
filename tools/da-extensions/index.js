/**
 * DA Extensions Shell
 *
 * Entry point loaded inside the DA Library iframe. Responsibilities:
 *  1. Handshake with DA via MessageChannel to receive IMS token + project context
 *  2. Render top-tab navigation (Commerce | Workfront | Stock)
 *  3. Lazy-load each tool module on demand
 *  4. Wire up shared DaBridge and AuthManager to each tool's render context
 */

import DaBridge from './shared/da-bridge.js';
import AuthManager from './shared/auth.js';
import { renderLoading, renderError } from './shared/ui.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let token = null;
let project = null;
let bridge = null;
let auth = null;

/** Map of tab key → { label, icon, path } */
const TOOLS = [
  { key: 'commerce',  label: 'Commerce',  icon: '🛍',  path: './tools/commerce.js' },
  { key: 'workfront', label: 'Workfront', icon: '📋', path: './tools/workfront.js' },
  { key: 'stock',     label: 'Stock',     icon: '📷', path: './tools/stock.js' },
];

/** Cache of already-imported tool modules */
const moduleCache = {};

// ---------------------------------------------------------------------------
// DA postMessage handshake
// ---------------------------------------------------------------------------
/**
 * DA sends the initial message on a MessageChannel port.
 * We listen on window for a message whose data has { ready: true }, then
 * capture the port and reply with nothing — DA immediately sends the payload.
 *
 * Actual protocol (from da.live source):
 *   1. DA posts  { ready: true }  with a MessageChannel port in event.ports[0]
 *   2. DA then posts { token, project }  on that same port
 */
function initDaHandshake() {
  window.addEventListener('message', (event) => {
    // Accept the initial "ready" message from any origin (DA may be on a different host)
    if (!event.data?.ready) return;

    const port = event.ports?.[0];
    if (!port) {
      console.warn('[da-extensions] Received ready message but no MessageChannel port.');
      return;
    }

    // DA sends token + project context on the port
    port.onmessage = (portEvent) => {
      const data = portEvent.data;

      // First message from DA contains token + project
      if (data?.token && !token) {
        token = data.token;
        project = data.project ?? {};
        bridge = new DaBridge(port);
        auth = new AuthManager(token);
        bootstrap();
        return;
      }

      // Subsequent messages are handled by DaBridge (e.g. sendSelection response)
      bridge?.handleMessage(portEvent);
    };

    port.start();
  });
}

// ---------------------------------------------------------------------------
// Shell bootstrap
// ---------------------------------------------------------------------------
function bootstrap() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Build shell skeleton
  const nav = buildNav();
  const content = document.createElement('div');
  content.className = 'tool-content';
  content.id = 'tool-content';

  app.appendChild(nav);
  app.appendChild(content);

  // Activate first tab
  activateTab(TOOLS[0].key);
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function buildNav() {
  const nav = document.createElement('nav');
  nav.className = 'tab-nav';

  TOOLS.forEach(({ key, label, icon }) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.key = key;
    btn.setAttribute('aria-label', label);
    btn.title = label;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'tab-icon';
    iconSpan.textContent = icon;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'tab-label';
    labelSpan.textContent = label;

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => activateTab(key));
    nav.appendChild(btn);
  });

  return nav;
}

function setActiveTabButton(key) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.key === key);
    btn.setAttribute('aria-selected', btn.dataset.key === key ? 'true' : 'false');
  });
}

// ---------------------------------------------------------------------------
// Tool routing
// ---------------------------------------------------------------------------
async function activateTab(key) {
  setActiveTabButton(key);

  const content = document.getElementById('tool-content');
  content.innerHTML = '';

  const spinner = renderLoading();
  content.appendChild(spinner);

  const toolDef = TOOLS.find((t) => t.key === key);
  if (!toolDef) {
    content.innerHTML = '';
    content.appendChild(renderError(`Unknown tool: ${key}`));
    return;
  }

  try {
    const mod = await loadTool(toolDef.path);
    content.innerHTML = '';

    /** @type {{ name: string, icon: string, render(container: HTMLElement, ctx: object): void }} */
    const tool = mod.default ?? mod;

    if (typeof tool.render !== 'function') {
      throw new Error(`Tool "${key}" does not export a render() function.`);
    }

    tool.render(content, { token, project, bridge, auth });
  } catch (err) {
    console.error(`[da-extensions] Failed to load tool "${key}":`, err);
    content.innerHTML = '';
    content.appendChild(renderError(`Failed to load ${toolDef.label}: ${err.message}`));
  }
}

async function loadTool(path) {
  if (!moduleCache[path]) {
    moduleCache[path] = await import(path);
  }
  return moduleCache[path];
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
initDaHandshake();

// ---------------------------------------------------------------------------
// Development / standalone mode
// When not inside DA (no postMessage handshake arrives within 2 s), render
// a mock UI so developers can work on tools without a full DA context.
// ---------------------------------------------------------------------------
setTimeout(() => {
  if (token) return; // Already initialised via DA

  console.info('[da-extensions] DA handshake not detected — entering dev mode with mock context.');
  token = 'DEV_TOKEN_PLACEHOLDER';
  project = { org: 'dev', repo: 'dev', ref: 'main', path: '/', view: 'edit' };

  // Create a no-op bridge for dev mode
  bridge = {
    sendText: (t) => console.log('[dev-bridge] sendText:', t),
    sendHTML: (h) => console.log('[dev-bridge] sendHTML:', h),
    getSelection: () => Promise.resolve('<p>Mock selection</p>'),
    closeLibrary: () => console.log('[dev-bridge] closeLibrary'),
  };

  auth = new AuthManager(token);
  bootstrap();
}, 2000);
