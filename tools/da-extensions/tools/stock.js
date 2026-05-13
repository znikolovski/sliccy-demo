/**
 * Adobe Stock Tool — image search and insertion
 *
 * =============================================================================
 * FULL IMPLEMENTATION GUIDE
 * =============================================================================
 * A production version of this tool would:
 *
 *  1. REQUIREMENTS
 *     Adobe Stock Enterprise subscription is required. The Stock API is not
 *     available to individual Creative Cloud accounts as of November 2024.
 *     See: https://developer.adobe.com/stock/docs/
 *
 *  2. AUTHENTICATION
 *     The IMS token from DA works directly with Stock Enterprise.
 *     Required headers:
 *       Authorization: Bearer <token>   ← from context.auth
 *       x-api-key: <your-api-key>       ← from Adobe Developer Console integration
 *       x-product: <your-app-name>      ← identifies your application
 *
 *  3. SEARCH
 *     GET https://stock.adobe.com/Rest/Media/1/Search/Files
 *       ?locale=en_US
 *       &search_parameters[words]=<query>
 *       &search_parameters[limit]=20
 *       &search_parameters[offset]=0
 *       &search_parameters[filters][content_type:photo]=1
 *       &result_columns[]=id
 *       &result_columns[]=title
 *       &result_columns[]=thumbnail_url
 *       &result_columns[]=thumbnail_width
 *       &result_columns[]=thumbnail_height
 *       &result_columns[]=comp_url
 *       &result_columns[]=is_licensed
 *
 *     Response: { nb_results: N, files: [{ id, title, thumbnail_url, comp_url, is_licensed }] }
 *
 *  4. LICENSE & DOWNLOAD
 *     GET https://stock.adobe.com/Rest/Libraries/1/Content/License
 *       ?content_id=<id>
 *       &license=Standard
 *     Response: { contents: { <id>: { purchase_details: { state, url } } } }
 *
 *  5. INSERT IMAGE
 *     Use context.bridge.sendHTML() to insert at cursor:
 *       context.bridge.sendHTML(
 *         `<picture><source srcset="${highResUrl}"><img src="${thumbnailUrl}" alt="${title}"></picture>`
 *       );
 *
 *  6. CONFIG
 *     Store your Stock API key in site config:
 *       key: stock-api-key
 *       value: your_key_here
 *     Read via: await getSiteConfig(context, 'stock-api-key')
 *
 * SEARCH EXAMPLE:
 *   const resp = await context.auth.fetch(
 *     `https://stock.adobe.com/Rest/Media/1/Search/Files` +
 *     `?locale=en_US&search_parameters[words]=${encodeURIComponent(q)}` +
 *     `&search_parameters[limit]=20` +
 *     `&result_columns[]=id&result_columns[]=title&result_columns[]=thumbnail_url&result_columns[]=comp_url`,
 *     {
 *       headers: {
 *         'x-api-key': apiKey,
 *         'x-product': 'sliccy-demo',
 *       },
 *     }
 *   );
 *   const { files } = await resp.json();
 * =============================================================================
 *
 * @module tools/stock
 */

import { renderSearchInput, renderCardGrid, renderCard, renderEmpty, renderNotice } from '../shared/ui.js';

export default {
  name: 'Stock',
  icon: '📷',

  /**
   * @param {HTMLElement} container
   * @param {{ token: string, project: object, bridge: import('../shared/da-bridge.js').default, auth: import('../shared/auth.js').default }} context
   */
  render(container, context) {
    const searchEl = renderSearchInput({
      placeholder: 'Search Adobe Stock…',
      onSearch: (query) => handleSearch(query, container, context),
    });
    container.appendChild(searchEl);

    const notice = renderNotice(
      '<strong>Adobe Stock Enterprise required.</strong> '
      + 'Add <code>stock-api-key</code> to your site config sheet to enable image search. '
      + 'See the README for the full integration guide.',
    );
    container.appendChild(notice);

    // Placeholder grid
    const placeholders = [
      { title: 'Nature', meta: 'Photo' },
      { title: 'Business', meta: 'Photo' },
      { title: 'Technology', meta: 'Vector' },
      { title: 'People', meta: 'Photo' },
    ];
    const grid = renderCardGrid(placeholders, (item) =>
      renderCard({
        placeholder: '📷',
        title: item.title,
        meta: item.meta,
        onClick: () => showNotConnected(container),
      }),
    );
    container.appendChild(grid);
  },
};

function handleSearch(query, container, context) {
  if (!query) return;
  clearResults(container);
  container.appendChild(
    renderEmpty(
      'Stock not yet connected',
      '📷',
      `Configure stock-api-key in site config to search Adobe Stock. Query: "${query}"`,
    ),
  );
}

function showNotConnected(container) {
  clearResults(container);
  container.appendChild(
    renderEmpty(
      'Adobe Stock Enterprise required',
      '📷',
      'Add stock-api-key to site config to license and insert Stock images.',
    ),
  );
}

function clearResults(container) {
  while (container.children.length > 2) {
    container.removeChild(container.lastChild);
  }
}
