export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');

    // The row has one child div containing all card content
    const cardContent = row.querySelector(':scope > div');
    if (!cardContent) return;

    // Find image (first picture/img element)
    const picture = cardContent.querySelector('picture');
    if (picture) {
      const img = picture.querySelector('img');
      if (img) {
        img.style.aspectRatio = '4/3';
        img.style.objectFit = 'cover';
      }
      const imageDiv = document.createElement('div');
      imageDiv.classList.add('cards-product-card-image');
      imageDiv.append(picture);
      li.append(imageDiv);
    }

    // Remaining content goes into card body
    const bodyDiv = document.createElement('div');
    bodyDiv.classList.add('cards-product-card-body');

    // Move all remaining children into body
    [...cardContent.children].forEach((child) => {
      // Decorate links as buttons
      child.querySelectorAll('a').forEach((a) => {
        a.classList.add('button');
        const wrapper = a.closest('.button-container') || (() => {
          const div = document.createElement('p');
          div.classList.add('button-container');
          a.replaceWith(div);
          div.append(a);
          return div;
        })();
      });
      bodyDiv.append(child);
    });

    li.append(bodyDiv);
    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
