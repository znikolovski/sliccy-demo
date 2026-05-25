import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';
import {
  loadCommerceEager,
  loadCommerceLazy,
  initializeCommerce,
  applyTemplates,
  decorateLinks,
  loadErrorPage,
} from './commerce.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Auto-builds a columns block from flat DA content.
 *
 * The DA document for the homepage delivers the "Energy Tactics" promo
 * as flat paragraphs (no authored table block), so we detect it by the
 * h2 text and synthesise the two-column block structure in-place:
 *
 *   <div class="columns">
 *     <div>                     ← row
 *       <div>text content</div> ← left cell (grey bg via CSS)
 *       <div><picture/></div>   ← right cell (image)
 *     </div>
 *   </div>
 *
 * The block is inserted in-place where the h2 was, inside the same
 * section div. decorateSections will wrap it in a block-wrapper div,
 * and decorateBlocks will load the columns CSS/JS.
 *
 * @param {Element} main The main element
 */
function buildColumnsBlock(main) {
  // Find the h2 that marks the start of the Energy Tactics promo
  const h2 = [...main.querySelectorAll('h2')].find(
    (el) => el.textContent.trim().toLowerCase().includes('energy tactics'),
  );
  if (!h2) return;
  // Skip if already inside a columns block (idempotent)
  if (h2.closest('.columns')) return;

  const parentSection = h2.parentElement;
  if (!parentSection) return;

  // Collect siblings after h2 until we hit the next heading or find the image
  // Expected sequence: p(body text), p(CTA link), p(img/picture)
  const textNodes = [];
  let imgPara = null;
  let cursor = h2.nextElementSibling;
  while (cursor) {
    const tag = cursor.tagName.toLowerCase();
    if (tag === 'h2' || tag === 'h3' || tag === 'h1') break;
    if (cursor.querySelector('picture, img')) {
      imgPara = cursor;
      cursor = cursor.nextElementSibling;
      break;
    }
    textNodes.push(cursor);
    cursor = cursor.nextElementSibling;
  }

  // Need at least the h2 and an image paragraph to build the block
  if (!imgPara) return;

  // Build left cell: h2 + text paragraphs
  const leftCell = document.createElement('div');
  leftCell.append(h2);
  textNodes.forEach((n) => leftCell.append(n));

  // Build right cell: picture (unwrap from <p> if needed)
  const rightCell = document.createElement('div');
  const picture = imgPara.querySelector('picture');
  if (picture) {
    rightCell.append(picture);
    imgPara.remove();
  } else {
    rightCell.append(imgPara);
  }

  // Assemble the columns block
  const row = document.createElement('div');
  row.append(leftCell, rightCell);
  const block = document.createElement('div');
  block.classList.add('columns');
  block.append(row);

  // Insert the block in-place where the h2 was (h2 is now inside leftCell).
  // cursor points to the element after all consumed nodes; insert before it,
  // or append to the parent if cursor is null.
  if (cursor && cursor.parentElement === parentSection) {
    parentSection.insertBefore(block, cursor);
  } else {
    parentSection.append(block);
  }
}

/**
 * Converts raw "style / dark" paragraph pairs into a proper section-metadata
 * block that aem.js decorateSections can consume.
 *
 * The DA document emits key/value metadata as plain <p> pairs instead of a
 * recognised block table. EDS decorateSections only processes
 * <div class="section-metadata">. We detect the pattern and synthesise that
 * structure before decorateSections runs.
 *
 * Handles two authoring variants:
 *   (a) <p>style</p> <p>dark</p>  → full key/value pair
 *   (b) <p>dark</p>               → bare value shorthand (adds class directly)
 *
 * @param {Element} main The main element
 */
function buildSectionMetadata(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const paragraphs = [...section.querySelectorAll('p')];
    let i = 0;
    while (i < paragraphs.length) {
      const p = paragraphs[i];
      const key = p.textContent.trim().toLowerCase();
      if (key === 'style') {
        // Next paragraph should be the value (e.g. "dark")
        const next = paragraphs[i + 1];
        if (next) {
          // Build a proper section-metadata block
          const keyCell = document.createElement('div');
          keyCell.textContent = p.textContent.trim();
          const valCell = document.createElement('div');
          valCell.textContent = next.textContent.trim();
          const metaRow = document.createElement('div');
          metaRow.append(keyCell, valCell);
          const metaBlock = document.createElement('div');
          metaBlock.classList.add('section-metadata');
          metaBlock.append(metaRow);
          // Replace the key paragraph with the block; remove the value paragraph
          p.replaceWith(metaBlock);
          next.remove();
          i += 2;
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      i += 1;
    }
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    buildHeroBlock(main);
    buildColumnsBlock(main);
    buildSectionMetadata(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateLinks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  // Handle page-level redirects defined via the page-metadata block in DA.
  // A table with first cell "Page Metadata" and a row "Redirect | /target/" triggers a redirect.
  const pageMetaBlock = doc.querySelector('.page-metadata');
  if (pageMetaBlock) {
    const rows = pageMetaBlock.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === 'redirect') {
        window.location.replace(cells[1].textContent.trim());
      }
    });
  }
  // Fire-and-forget commerce init: do not block page rendering on commerce setup.
  // Commerce dropins will initialize async in the background once config is fetched.
  initializeCommerce().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('Commerce initialization failed:', e.message);
  });
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await applyTemplates(main);
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector(':scope > div'), waitForFirstImage);
    await loadCommerceEager(main);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  await loadCommerceLazy(main);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
