# DA Extensions

A multi-tool integration framework for the DA (da.live) Library palette. Extends the authoring experience with Adobe tool integrations — Commerce product picker, Adobe Stock image search, Workfront task browser, and more.

## How it works

DA's Library panel is a 280×430px floating panel in the editor, triggered by the Library toolbar button. Plugins load as iframes inside this panel.

When the plugin iframe loads, DA establishes a `MessageChannel` and sends the author's Adobe IMS bearer token + current document context to the iframe. That single token authenticates against all Adobe enterprise APIs (Commerce, Stock, AEM Assets, Workfront, Experience Platform, etc).

```
Author clicks Library → DA opens panel → loads /tools/da-extensions/index.html
  → DA sends { token, project } via MessageChannel
  → Shell renders tool tabs (Commerce / Workfront / Stock)
  → Author picks something → tool calls bridge.sendHTML() → content inserted at cursor
  → Panel closes
```

## File structure

```
tools/da-extensions/
  index.html          ← iframe src registered in site config library sheet
  index.js            ← shell: handshake, tab nav, lazy-loads tools
  index.css           ← shell styles
  README.md           ← this file
  tools/
    commerce.js       ← Commerce product/category picker
    workfront.js      ← Workfront asset/task browser
    stock.js          ← Adobe Stock image search
  shared/
    da-bridge.js      ← DaBridge — wraps DA postMessage protocol
    auth.js           ← AuthManager — token storage + fetch wrapper
    ui.js             ← Shared UI primitives
```

## Registering in DA

Add a row to the `library` sheet in your site's `config.xlsx`:

| title | path | experience |
|-------|------|-----------|
| Tools | /tools/da-extensions | inline |

The `inline` experience slides in as a panel within the Library. Other options: `dialog` (modal), `window` (new tab).

## Adding a new tool

1. Create `tools/da-extensions/tools/mytool.js`:

```javascript
import { renderSearchInput, renderEmpty } from '../shared/ui.js';

export default {
  name: 'My Tool',   // displayed in tab nav
  icon: '🔧',        // tab icon
  render(container, context) {
    // context = { token, project, bridge, auth }
    const search = renderSearchInput({
      placeholder: 'Search…',
      onSearch: async (q) => {
        const resp = await context.auth.fetch(`https://myapi.example.com/search?q=${q}`);
        const data = await resp.json();
        // render results, call context.bridge.sendHTML() on selection
      },
    });
    container.appendChild(search);
  },
};
```

2. Import and add to `TOOLS` in `index.js`:

```javascript
// In the TOOLS array:
{ key: 'mytool', label: 'My Tool', icon: '🔧', path: './tools/mytool.js' },
```

That's it. Tab nav and lazy-loading are handled by the shell.

## DaBridge API

`context.bridge` is an instance of `DaBridge`. All communication with the DA editor goes through it.

```javascript
// Insert plain text at cursor
context.bridge.sendText('Hello world');

// Insert HTML at cursor (tables become EDS blocks)
context.bridge.sendHTML('<table><tr><th>product-details</th></tr></table>');

// Insert an image
context.bridge.sendHTML('<picture><img src="https://..." alt="description"></picture>');

// Get the currently selected HTML
const selected = await context.bridge.getSelection();

// Close the Library panel
context.bridge.closeLibrary();

// Navigate DA to a document
context.bridge.setHash('/my-org/my-repo/path/to/doc');
```

## AuthManager API

`context.auth` is an instance of `AuthManager`.

```javascript
// Authenticated fetch — adds Authorization: Bearer <token>
const resp = await context.auth.fetch('https://api.example.com/data');

// POST JSON with auth
const resp = await context.auth.postJSON('https://api.example.com/create', { key: 'value' });

// GraphQL query with auth
const { data, errors } = await context.auth.graphql(
  'https://catalog-service.adobe.io/graphql',
  `query { productSearch(phrase: "shirt") { items { productView { sku name } } } }`,
);

// Raw token (for APIs that need custom header names)
const token = context.auth.getToken();
```

## IMS Token — what it accesses

The token DA passes is the author's full Adobe IMS bearer token. It works with:

| Service | Base URL | Extra headers needed |
|---------|----------|---------------------|
| Commerce Catalog Service | `https://catalog-service.adobe.io/graphql` | `Magento-Store-Code` |
| AEM Assets | `https://author-p<env>.adobeaemcloud.com/` | — |
| Adobe Stock Enterprise | `https://stock.adobe.com/Rest/Media/1/Search/Files` | `x-api-key`, `x-product` |
| Adobe Experience Platform | `https://platform.adobe.io/` | `x-gw-ims-org-id`, `x-sandbox-name` |
| Workfront | `https://<org>.my.workfront.com/attask/api/v15.0/` | See note below |

**Workfront note:** Workfront uses its own session auth (`sessionID`), not an IMS bearer token directly. SSO between IMS and Workfront requires the org's Workfront instance to be federated with Adobe IMS. Check with your Workfront admin before building the integration.

## Dev mode

When running outside of DA (e.g. `aem up` locally), the shell detects the missing handshake after 2 seconds and enters dev mode:
- Token is set to `DEV_TOKEN_PLACEHOLDER`
- Bridge logs all calls to the console instead of posting to DA
- All three tools render normally

To test locally: `aem up` in the repo root, navigate to `http://localhost:3000/tools/da-extensions`.
