/*
 * Tiny DOM helpers shared across the section builders.
 */

/**
 * Builds an element with an optional class and text content.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Builds a `<button type="button">` with a class, text label and attributes.
 * @param {string} className
 * @param {string} label
 * @param {Object<string, string>} [attributes]
 * @returns {HTMLButtonElement}
 */
export function createButton(className, label, attributes = {}) {
  const button = el('button', className, label);
  button.type = 'button';
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });
  return button;
}

/**
 * Builds a `<button type="button">` with a leading icon plus a text label.
 * @param {string} className
 * @param {string} label
 * @param {string} icon Inline SVG markup, rendered inside a `.btn-icon` span
 * @param {Object<string, string>} [attributes]
 * @returns {HTMLButtonElement}
 */
export function createIconButton(className, label, icon, attributes = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });

  const iconEl = document.createElement('span');
  iconEl.className = 'btn-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML = icon;

  const labelEl = document.createElement('span');
  labelEl.className = 'btn-label';
  labelEl.textContent = label;

  button.append(iconEl, labelEl);
  return button;
}
