/**
 * loads and decorates the assets-navigation block
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // decorate footer DOM
  block.textContent = '';
  const wrapper = document.createElement('div');
  const body = document.createElement('h2');

  body.innerHTML = 'Hi, Im the assets listing block';

  wrapper.append(body);

  block.append(wrapper);
}
