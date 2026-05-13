/**
 * Workfront Tool — Adobe Workfront task & asset browser
 *
 * =============================================================================
 * FULL IMPLEMENTATION GUIDE
 * =============================================================================
 * A production version of this tool would:
 *
 *  1. CONFIGURATION
 *     Read `workfront-url` from the site config sheet
 *     (/.da/config.xlsx → the "workfront-url" row).
 *     Example value: https://acme.my.workfront.com
 *
 *  2. AUTHENTICATION
 *     The IMS token works directly with Workfront REST API when the
 *     Workfront instance is configured for Adobe Unified Experience (AUX).
 *     Header: Authorization: Bearer <IMS token>
 *
 *  3. WORKFRONT REST API BASE
 *     https://{{workfront-url}}/attask/api/v15.0/
 *     Docs: https://developer.adobe.com/workfront/
 *
 *  4. LIST TASKS
 *     GET /attask/api/v15.0/TASK/search?fields=name,status,assignedTo:name,plannedCompletionDate
 *     Filter by project: &projectID=<id>
 *
 *  5. LIST DOCUMENTS (assets)
 *     GET /attask/api/v15.0/DOCU/search?fields=name,downloadURL,docObjCode
 *     Returns document metadata including download URLs.
 *
 *  6. INSERT TASK REFERENCE
 *     On task selection:
 *       context.bridge.sendHTML(`
 *         <table>
 *           <tr><th>workfront-task</th></tr>
 *           <tr><td>${task.ID}</td><td>${task.name}</td></tr>
 *         </table>
 *       `)
 *
 *  7. INSERT DOCUMENT LINK
 *       context.bridge.sendHTML(`<a href="${doc.downloadURL}">${doc.name}</a>`)
 *
 * API EXAMPLE:
 *   const res = await context.auth.fetch(
 *     `${wfUrl}/attask/api/v15.0/TASK/search?status=INP&fields=name,status,plannedCompletionDate`
 *   );
 *   const { data } = await res.json();
 *   // data is an array of task objects
 * =============================================================================
 *
 * @module tools/workfront
 */

import { renderEmpty, renderNotice } from '../shared/ui.js';

export default {
  name: 'Workfront',
  icon: '📋',

  /**
   * @param {HTMLElement} container
   * @param {{ token: string, project: object, bridge: import('../shared/da-bridge.js').default, auth: import('../shared/auth.js').default }} context
   */
  render(container, context) {
    const notice = renderNotice(
      '<strong>Workfront integration</strong> — connect your Workfront instance by adding '
      + '<code>workfront-url</code> to your site config sheet (<code>/.da/config.xlsx</code>). '
      + 'Example: <code>https://acme.my.workfront.com</code>.<br><br>'
      + 'Once connected, this panel will let you browse tasks and assets and '
      + 'insert references directly into your document.',
    );
    container.appendChild(notice);

    const empty = renderEmpty(
      'Not yet connected',
      '📋',
      'Add your Workfront instance URL to site config to browse tasks and assets.',
    );
    container.appendChild(empty);

    // Placeholder: two feature-preview rows to indicate what will appear
    const previewSection = buildFeaturePreview();
    container.appendChild(previewSection);
  },
};

// ---------------------------------------------------------------------------
// Feature preview (placeholder UI)
// ---------------------------------------------------------------------------

function buildFeaturePreview() {
  const section = document.createElement('div');
  section.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:4px;';

  const features = [
    { icon: '✅', label: 'Browse & filter tasks by project / status' },
    { icon: '📎', label: 'Search documents and assets' },
    { icon: '🔗', label: 'Insert task references & document links' },
  ];

  features.forEach(({ icon, label }) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;'
      + 'background:#fff;border:1px solid #e0e0e0;border-radius:6px;font-size:12px;color:#464646;';

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '14px';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    row.appendChild(iconEl);
    row.appendChild(labelEl);
    section.appendChild(row);
  });

  return section;
}
