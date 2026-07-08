import { getRoute, subscribeRoute } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';

/**
 * Renders the current route path into the given element.
 * @param {Element} el target element
 * @param {{ path: string }} route current route
 */
function renderPath(el, route) {
  el.textContent = route.path || '(sin carpeta seleccionada)';
}

/**
 * Loads and decorates the assetslisting block.
 *
 * For now it only reflects the route `path` as text, updating whenever the hash
 * changes. It reads the current route on init and subscribes for updates; the
 * subscription self-cleans once the block leaves the DOM (view change).
 * @param {Element} block The assetslisting block element
 */
export default function decorate(block) {
  const path = document.createElement('p');
  path.className = 'assetslisting-path';
  block.replaceChildren(path);

  // In Universal Editor the route is not driving anything, so just show a static
  // placeholder and don't wire the router (avoids mutating instrumented markup).
  if (isEditMode()) {
    path.textContent = 'Assets listing (vista dinámica en runtime)';
    return;
  }

  renderPath(path, getRoute());

  const unsubscribe = subscribeRoute((route) => {
    if (!block.isConnected) {
      unsubscribe();
      return;
    }
    renderPath(path, route);
  });
}
