/*
 * Hash-based router — single source of truth for the SPA navigation state.
 *
 * The full navigation context lives in the URL hash so every view is shareable
 * and survives a cold load on EDS static hosting (a real path like
 * `/assets-listing?path=x` would 404 on refresh; a hash never leaves the shell).
 *
 * Route model:
 *   { view: string, path: string, filters: { [key]: string } }
 *
 * Hash format:
 *   #/<view>?path=<path>&<filterKey>=<filterValue>...
 *   e.g. #/assets-listing?path=/brand&type=image
 *
 * This module is intentionally view-agnostic: it only reads/writes the hash and
 * notifies subscribers. Which views are valid and what the default is are the
 * hub's concern (see hub.js).
 */

const handlers = new Set();

/**
 * Parses the current location hash into a route object.
 * @returns {{ view: string, path: string, filters: Object }}
 */
export function getRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [view = '', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);

  const filters = {};
  params.forEach((value, key) => {
    if (key !== 'path') filters[key] = value;
  });

  return {
    view: decodeURIComponent(view),
    path: params.get('path') || '',
    filters,
  };
}

/**
 * Serializes a route object into a hash string.
 * @param {{ view: string, path?: string, filters?: Object }} route
 * @returns {string}
 */
function buildHash({ view, path = '', filters = {} }) {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') params.set(key, value);
  });
  const query = params.toString();
  return `#/${encodeURIComponent(view)}${query ? `?${query}` : ''}`;
}

function emit() {
  const route = getRoute();
  handlers.forEach((handler) => handler(route));
}

/**
 * Subscribes to route changes. The handler is invoked with the new route on
 * every change (and on the initial route once startRouter runs).
 * @param {(route: Object) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function subscribeRoute(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Navigates to a route by updating the location hash.
 * @param {{ view: string, path?: string, filters?: Object }} route
 * @param {{ replace?: boolean }} [options] replace avoids adding a history entry
 */
export function navigate(route, { replace = false } = {}) {
  const hash = buildHash(route);

  if (replace) {
    // replaceState does not fire hashchange, so notify manually.
    window.history.replaceState(null, '', hash);
    emit();
  } else if (hash === window.location.hash) {
    // Same hash: no hashchange will fire, but subscribers may still need to
    // re-apply context (e.g. re-triggering the default view).
    emit();
  } else {
    // Fires hashchange -> emit() via the listener registered in startRouter.
    window.location.hash = hash;
  }
}

/**
 * Starts listening for hash changes and emits the initial route.
 */
export function startRouter() {
  window.addEventListener('hashchange', emit);
  emit();
}
