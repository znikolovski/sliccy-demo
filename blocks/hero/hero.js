export default async function decorate(block) {
  // Hero is a full-width background image — no DOM restructuring needed.
  // EDS decorates cells; the single image cell renders as-is.
  // Add loading="eager" so the above-the-fold hero loads immediately.
  const img = block.querySelector('img');
  if (img) {
    img.setAttribute('loading', 'eager');
    img.setAttribute('fetchpriority', 'high');
  }
}
