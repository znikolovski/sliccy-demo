import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Builds the newsletter form in the footer.
 * @param {Element} block The footer block element
 */
function buildNewsletterForm(block) {
  // Find the newsletter section (first section, second child div)
  const section = block.querySelector('.section:first-child > div');
  if (!section) return;

  const newsletterCol = section.querySelector('div');
  if (!newsletterCol) return;

  // Replace the placeholder paragraph with an actual email input form
  const placeholderP = newsletterCol.querySelector('p:nth-child(2)');
  if (placeholderP) {
    const form = document.createElement('form');
    form.classList.add('newsletter-form');
    form.setAttribute('action', '#');
    form.setAttribute('method', 'post');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value) {
        input.value = '';
        input.placeholder = 'Thank you for subscribing!';
      }
    });

    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'email';
    input.placeholder = 'Enter your email address';
    input.required = true;
    input.setAttribute('aria-label', 'Email address');

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Subscribe';

    form.append(input, btn);
    placeholderP.replaceWith(form);
  }

  // Remove the subscribe link button-container (replaced by form above)
  const btnContainer = newsletterCol.querySelector('.button-container');
  if (btnContainer) btnContainer.remove();
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);

  // Build newsletter form
  buildNewsletterForm(block);
}
