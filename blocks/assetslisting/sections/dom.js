/*
 * Tiny DOM helpers shared across the section builders.
 */

/**
 * Builds a `<button type="button">` with a class, text label and attributes.
 * @param {string} className
 * @param {string} label
 * @param {Object<string, string>} [attributes]
 * @returns {HTMLButtonElement}
 */
export default function createButton(className, label, attributes = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });
  return button;
}
