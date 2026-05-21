import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Normalises the nav fragment so it always has three children:
 *   [0] brand   logo / wordmark
 *   [1] sections  primary navigation links
 *   [2] tools    utility links (sign in, cart, &)
 *
 * The DA-authored nav may arrive as a single <div> that contains
 * both the logo <p> and the nav <ul> merged together.  When that
 * happens we split them into the expected three children so the
 * rest of the decoration logic works unchanged.
 *
 * @param {DocumentFragment} fragment
 */
function normaliseNavFragment(fragment) {
  const children = [...fragment.children];

  // Happy path: already three divs
  if (children.length >= 3) return;

  if (children.length === 1) {
    // Single-div DA structure: <div> logo-p + nav-ul [+ tools-ul] </div>
    const singleDiv = children[0];
    const logoPara = singleDiv.querySelector(':scope > p:first-child');
    const navUl = singleDiv.querySelector(':scope > ul:first-of-type');
    // A second ul may carry tools links (sign-in, cart&)
    const toolsUl = singleDiv.querySelectorAll(':scope > ul')[1];

    // Brand div
    const brandDiv = document.createElement('div');
    if (logoPara) brandDiv.append(logoPara.cloneNode(true));
    else {
      // Fallback text logo
      const p = document.createElement('p');
      p.textContent = 'BODÉA INC.';
      brandDiv.append(p);
    }

    // Sections div
    const sectionsDiv = document.createElement('div');
    if (navUl) sectionsDiv.append(navUl.cloneNode(true));

    // Tools div
    const toolsDiv = document.createElement('div');
    if (toolsUl) {
      toolsDiv.append(toolsUl.cloneNode(true));
    } else {
      // Inject default utility links
      const ul = document.createElement('ul');
      ul.innerHTML = `
        <li><a href="/customer/account/login/">Sign In</a></li>
        <li><a href="/customer/account/create/">Create an Account</a></li>
        <li><a href="/quickorder/">Quick Order</a></li>
      `;
      toolsDiv.append(ul);
    }

    // Replace the single child with the three normalised divs
    singleDiv.replaceWith(brandDiv, sectionsDiv, toolsDiv);
    return;
  }

  if (children.length === 2) {
    // Two-div structure: brand + sections, no tools
    const toolsDiv = document.createElement('div');
    const ul = document.createElement('ul');
    ul.innerHTML = `
      <li><a href="/customer/account/login/">Sign In</a></li>
      <li><a href="/customer/account/create/">Create an Account</a></li>
      <li><a href="/quickorder/">Quick Order</a></li>
    `;
    toolsDiv.append(ul);
    fragment.append(toolsDiv);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // Normalise fragment to the expected 3-div brand/sections/tools structure
  normaliseNavFragment(fragment);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand ? navBrand.querySelector('.button') : null;
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  // If brand has no visible image, show text fallback
  const brandImg = navBrand ? navBrand.querySelector('img') : null;
  if (navBrand && !brandImg) {
    const existingText = navBrand.querySelector('p');
    if (!existingText) {
      const p = document.createElement('p');
      p.classList.add('nav-brand-text');
      p.textContent = 'BODÉA INC.';
      navBrand.prepend(p);
    }
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
