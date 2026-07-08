/**
 * loads and decorates the assets-navigation block
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  block.textContent = '';
  const heading = document.createElement('h2');
  heading.textContent = "Hi, I'm the assets listing block";
  block.append(heading);
}
