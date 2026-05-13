/**
 * Shared UI primitives for DA extensions
 *
 * All functions are pure: they accept configuration, build DOM, and return
 * an HTMLElement. No framework, no global state.
 *
 * Styles are defined in ../index.css using class names documented below.
 */

// ---------------------------------------------------------------------------
// Search input
// ---------------------------------------------------------------------------

/**
 * Render a search input field with debounced callback.
 *
 * @param {object} opts
 * @param {string}   opts.placeholder - Input placeholder text
 * @param {function} opts.onSearch    - Called with the current value after debounce
 * @param {number}   [opts.debounce]  - Debounce delay in ms (default 300)
 * @param {string}   [opts.value]     - Initial value
 * @returns {HTMLElement}
 */
export function renderSearchInput({ placeholder = 'Search…', onSearch, debounce: delay = 300, value = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'search-wrap';

  const icon = document.createElement('span');
  icon.className = 'search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🔍';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');

  // Debounce helper
  let timer;
  const fire = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(input.value.trim());
    }, delay);
  };

  input.addEventListener('input', fire);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(timer);
      if (typeof onSearch === 'function') onSearch(input.value.trim());
    }
    if (e.key === 'Escape') {
      input.value = '';
      if (typeof onSearch === 'function') onSearch('');
    }
  });

  wrap.appendChild(icon);
  wrap.appendChild(input);

  // Expose focus helper on the wrapper
  wrap.focus = () => input.focus();

  return wrap;
}

// ---------------------------------------------------------------------------
// Card grid
// ---------------------------------------------------------------------------

/**
 * Render a 2-column CSS grid of cards.
 *
 * @param {Array<*>}   items      - Data items to render
 * @param {function}   renderCard - Called with (item, index) → HTMLElement
 * @returns {HTMLElement}
 */
export function renderCardGrid(items, renderCard) {
  const grid = document.createElement('div');
  grid.className = 'card-grid';

  (items ?? []).forEach((item, i) => {
    try {
      const card = renderCard(item, i);
      if (card instanceof HTMLElement) {
        grid.appendChild(card);
      }
    } catch (err) {
      console.warn('[ui] renderCard threw for item', i, err);
    }
  });

  return grid;
}

/**
 * Convenience: build a single card element.
 *
 * @param {object} opts
 * @param {string}   [opts.imageUrl]     - Card thumbnail src
 * @param {string}   [opts.imageAlt]     - Alt text for image
 * @param {string}   [opts.placeholder]  - Emoji placeholder if no imageUrl
 * @param {string}   opts.title          - Card title (required)
 * @param {string}   [opts.meta]         - Secondary line of text
 * @param {function} [opts.onClick]      - Click handler
 * @returns {HTMLElement}
 */
export function renderCard({ imageUrl, imageAlt = '', placeholder = '🖼', title, meta, onClick } = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  if (imageUrl) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = imageUrl;
    img.alt = imageAlt;
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'card-image-placeholder';
    ph.textContent = placeholder;
    card.appendChild(ph);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = title ?? '';
  body.appendChild(titleEl);

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'card-meta';
    metaEl.textContent = meta;
    body.appendChild(metaEl);
  }

  card.appendChild(body);

  if (typeof onClick === 'function') {
    card.addEventListener('click', () => onClick());
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onClick();
    });
  }

  return card;
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

/**
 * Render a centred loading spinner.
 *
 * @param {string} [label] - Optional screen-reader label (default 'Loading…')
 * @returns {HTMLElement}
 */
export function renderLoading(label = 'Loading…') {
  const wrap = document.createElement('div');
  wrap.className = 'loading-wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-label', label);

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  const text = document.createElement('span');
  text.textContent = label;

  wrap.appendChild(spinner);
  wrap.appendChild(text);
  return wrap;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

/**
 * Render a centred empty-state message.
 *
 * @param {string} message       - Primary message
 * @param {string} [icon]        - Emoji icon (default '🔍')
 * @param {string} [description] - Optional secondary description
 * @returns {HTMLElement}
 */
export function renderEmpty(message, icon = '🔍', description = '') {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';

  const iconEl = document.createElement('div');
  iconEl.className = 'empty-icon';
  iconEl.textContent = icon;

  const title = document.createElement('div');
  title.className = 'empty-title';
  title.textContent = message;

  wrap.appendChild(iconEl);
  wrap.appendChild(title);

  if (description) {
    const desc = document.createElement('div');
    desc.className = 'empty-desc';
    desc.textContent = description;
    wrap.appendChild(desc);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

/**
 * Render a centred error message.
 *
 * @param {string} message - Error message text
 * @returns {HTMLElement}
 */
export function renderError(message) {
  const wrap = document.createElement('div');
  wrap.className = 'error-state';

  const icon = document.createElement('div');
  icon.className = 'error-icon';
  icon.textContent = '⚠️';

  const msg = document.createElement('div');
  msg.className = 'error-message';
  msg.textContent = message;

  wrap.appendChild(icon);
  wrap.appendChild(msg);
  return wrap;
}

// ---------------------------------------------------------------------------
// Notice / info banner
// ---------------------------------------------------------------------------

/**
 * Render an informational notice banner.
 *
 * @param {string} html - Inner HTML content (use sparingly; prefer text)
 * @returns {HTMLElement}
 */
export function renderNotice(html) {
  const notice = document.createElement('div');
  notice.className = 'notice';
  notice.innerHTML = html;
  return notice;
}
