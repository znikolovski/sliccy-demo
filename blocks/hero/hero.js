export default async function decorate(block) {
  const img = block.querySelector('img');
  if (img) {
    img.setAttribute('loading', 'eager');
    img.setAttribute('fetchpriority', 'high');
  }

  // If this block contains both a picture and text elements, style as overlay
  const picture = block.querySelector('picture');
  const hasText = block.querySelector('h1, h2, h3, p');

  if (picture && hasText) {
    const cell = picture.closest('div');
    if (cell) {
      cell.style.position = 'relative';
    }
  }
}
