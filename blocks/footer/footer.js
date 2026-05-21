import { getMetadata } from '../../scripts/aem.js';

/**
 * Fixes relative media URLs produced by DA (e.g. ./media_*.png).
 * @param {Element} el       The element to search within
 * @param {string}  basePath The footer page path used as the URL base
 */
function fixMediaUrls(el, basePath) {
  const base = new URL(basePath, window.location.href);
  el.querySelectorAll('img[src^="./media_"]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  el.querySelectorAll('source[srcset^="./media_"]').forEach((source) => {
    source.srcset = source.getAttribute('srcset').split(',').map((part) => {
      const trimmed = part.trim();
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx === -1) return new URL(trimmed, base).href;
      const url = trimmed.slice(0, spaceIdx);
      const descriptor = trimmed.slice(spaceIdx);
      return new URL(url, base).href + descriptor;
    }).join(', ');
  });
}

/**
 * Loads and decorates the footer block.
 *
 * We deliberately avoid `loadFragment` here because the DA footer page
 * (`/footer.plain.html`) contains a `<div class="footer">` block inside it.
 * If we used `loadFragment` → `loadBlocks`, EDS would try to load the `footer`
 * block again → infinite recursion.  Instead we fetch and parse the HTML
 * directly, then unwrap the inner block wrapper so the content lands
 * directly inside the outer EDS-managed `footer .footer` element.
 *
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location.href).pathname
    : '/footer';

  let content = null;
  try {
    const resp = await fetch(`${footerPath}.plain.html`);
    if (resp.ok) {
      const html = await resp.text();
      const tmp = document.createElement('div');
      tmp.innerHTML = html;

      // Fix relative media URLs before moving nodes into the live DOM
      fixMediaUrls(tmp, footerPath);

      // The DA footer page wraps everything in a `<div class="footer">` block.
      // Unwrap it so we don't end up with a nested .footer inside .footer.
      const innerBlock = tmp.querySelector('.footer');
      content = innerBlock || tmp;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Footer loading failed', e);
  }

  if (!content) return;

  block.textContent = '';
  block.append(...content.childNodes);
}
