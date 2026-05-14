/**
 * Columns block — 2-col promo layout.
 * Authored structure: one row with two cells (text | image).
 * The EDS framework wraps bare <picture> in <p> tags inside cells,
 * so images are kept in their own dedicated cell (per SKILL constraint).
 *
 * @param {Element} block The block element decorated by EDS
 */
export default async function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row) => {
    const cells = [...row.children];
    // Label cells for CSS targeting (text vs image)
    if (cells[0]) cells[0].classList.add('columns-text');
    if (cells[1]) cells[1].classList.add('columns-image');

    // Unwrap <p> wrapper that EDS adds around <picture> elements
    const imageCell = cells[1];
    if (imageCell) {
      const picWrapper = imageCell.querySelector('p > picture');
      if (picWrapper) {
        const p = picWrapper.parentElement;
        p.replaceWith(picWrapper);
      }
    }
  });
}
