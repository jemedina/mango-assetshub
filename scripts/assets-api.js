/*
 * Reusable client for the AEM Assets HTTP API (Siren-style JSON responses).
 *
 * Requests are made same-origin so they flow through whatever serves the app:
 * locally a dev proxy forwards /api to the local AEM, while other paths go to
 * EDS. Any authentication required by /api is handled by that serving layer
 * (the proxy / the environment) and must never be embedded here — this is
 * public client-side code.
 *
 * Absolute hrefs returned by the API (pointing at the AEM origin) are
 * normalized to same-origin pathnames so they keep flowing through the proxy.
 */

/**
 * Normalizes an API href into a same-origin pathname.
 * @param {string} href
 * @returns {string}
 */
export function toPathname(href) {
  if (!href) return '';
  try {
    return new URL(href, window.location).pathname;
  } catch {
    return href;
  }
}

/**
 * Returns the href of the first link matching the given rel.
 * @param {Object} entity a Siren entity
 * @param {string} rel e.g. 'self', 'content'
 * @returns {string}
 */
export function getLinkHref(entity, rel) {
  const link = entity?.links?.find((item) => item.rel?.includes(rel));
  return link ? link.href : '';
}

export function isFolderEntity(entity) {
  return Boolean(entity.class?.includes('assets/folder'));
}

export function isAssetEntity(entity) {
  return Boolean(entity.class?.includes('assets/asset'));
}

/**
 * Fetches an Assets API resource and returns the parsed Siren response.
 * @param {string} [path] e.g. /api/assets/marketing.json
 * @returns {Promise<Object>}
 */
export async function fetchAssets(path = '/api/assets.json') {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load assets: ${response.status}`);
  }
  return response.json();
}
