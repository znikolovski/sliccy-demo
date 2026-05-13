/**
 * Commerce Tool — Adobe Commerce / Magento product & category picker
 *
 * =============================================================================
 * FULL IMPLEMENTATION GUIDE
 * =============================================================================
 * A production version of this tool would:
 *
 *  1. CONFIGURATION
 *     Read `commerce-core-endpoint` from the site's config sheet
 *     (/.da/config.xlsx  → the "commerce-core-endpoint" row).
 *     Example value: https://catalog-service.adobe.io/graphql
 *
 *  2. AUTHENTICATION
 *     Use `context.auth.fetch()` which injects:
 *       Authorization: Bearer <IMS token>
 *       Magento-Store-Code: <store-code>  (from site config)
 *
 *  3. PRODUCT SEARCH via Commerce Catalog Service GraphQL
 *     Query: productSearch(phrase: $query, pageSize: 20)
 *     Returns: items[].productView { sku, name, url, images, price }
 *
 *  4. CATEGORY BROWSE
 *     Query: categories(ids: []) for top-level, drill down by id
 *
 *  5. INSERT BLOCK
 *     On product selection, call:
 *       context.bridge.sendHTML(`
 *         <table>
 *           <tr><th>product-details</th></tr>
 *           <tr><td>${product.url}</td></tr>
 *         </table>
 *       `)
 *     This inserts an EDS product-details block at the cursor.
 *
 *  6. CATEGORY INSERT
 *     context.bridge.sendHTML(`
 *       <table>
 *         <tr><th>product-list</th></tr>
 *         <tr><td>${category.urlKey}</td></tr>
 *       </table>
 *     `)
 *
 * GRAPHQL EXAMPLE:
 *   const { data } = await context.auth.graphql(endpoint, `
 *     query Search($q: String!) {
 *       productSearch(phrase: $q, pageSize: 20) {
 *         items { productView { sku name url images { url label } price { final { amount { value currency } } } } }
 *       }
 *     }
 *   `, { q: searchTerm });
 * =============================================================================
 *
 * @module tools/commerce
 */

import { renderSearchInput, renderCardGrid, renderCard, renderLoading, renderEmpty, renderNotice } from '../shared/ui.js';

export default {
  name: 'Commerce',
  icon: '🛍',

  /**
   * @param {HTMLElement} container
   * @param {{ token: string, project: object, bridge: import('../shared/da-bridge.js').default, auth: import('../shared/auth.js').default }} context
   */
  render(container, context) {
    // Search input
    const searchEl = renderSearchInput({
      placeholder: 'Search products…',
      onSearch: (query) => handleSearch(query, container, context),
    });
    container.appendChild(searchEl);

    // Config notice
    const notice = renderNotice(
      'Connect your Commerce catalog by adding <code>commerce-core-endpoint</code> to your '
      + 'site config sheet (<code>/.da/config.xlsx</code>). '
      + 'See the README for the full GraphQL integration guide.',
    );
    container.appendChild(notice);

    // Placeholder skeleton cards to show the intended layout
    const skeletonItems = [
      { title: 'Sample Product A', meta: 'SKU: ABC-001' },
      { title: 'Sample Product B', meta: 'SKU: ABC-002' },
      { title: 'Sample Category',  meta: '24 items' },
      { title: 'Featured Item',    meta: 'SKU: XYZ-999' },
    ];

    const grid = renderCardGrid(skeletonItems, (item) =>
      renderCard({
        placeholder: '📦',
        title: item.title,
        meta: item.meta,
        onClick: () => showNotConnected(container),
      }),
    );
    container.appendChild(grid);
  },
};

// ---------------------------------------------------------------------------
// Internal handlers
// ---------------------------------------------------------------------------

function handleSearch(query, container, context) {
  if (!query) return;

  // Remove previous results / messages below the search input
  clearResults(container);

  // In a real implementation:
  //   const endpoint = await getSiteConfig(context, 'commerce-core-endpoint');
  //   const results  = await context.auth.graphql(endpoint, SEARCH_QUERY, { q: query });
  //   renderResults(results.data.productSearch.items, container, context);

  const msg = renderEmpty(
    'Commerce not yet connected',
    '🛍',
    `Add "commerce-core-endpoint" to /.da/config.xlsx to enable product search. Query received: "${query}"`,
  );
  container.appendChild(msg);
}

function showNotConnected(container) {
  clearResults(container);
  const msg = renderEmpty(
    'Commerce not yet connected',
    '🛍',
    'Configure your Commerce catalog endpoint in site config to insert products.',
  );
  container.appendChild(msg);
}

function clearResults(container) {
  // Remove everything except the first two children (search input + notice)
  while (container.children.length > 2) {
    container.removeChild(container.lastChild);
  }
}
