/*
 * Reusable client for the AEM Assets HTTP API (Siren-style JSON responses).
 *
 * All requests are made same-origin so they flow through whatever is serving
 * the app: locally a dev proxy forwards /api to the local AEM (which requires
 * Basic auth), while other paths go to EDS. Absolute hrefs returned by the API
 * (pointing at the AEM origin) are normalized to same-origin pathnames.
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

function isLocal() {
  return LOCAL_HOSTS.includes(window.location.hostname);
}

/**
 * Auth headers for the request. Local AEM (through the dev proxy) needs Basic
 * auth; other environments rely on the session/CDN, so no header is added.
 * @returns {Object}
 */
function authHeaders() {
  return isLocal() ? { Authorization: `Basic ${btoa('admin:admin')}` } : {};
}

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
  const response = await fetch(url.pathname, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`Unable to load assets: ${response.status}`);
  }
  return response.json();
}

/**
 * Resolves a rendition href into a value usable as an <img> src. Locally the
 * rendition is protected, so it is fetched with auth and exposed as an object
 * URL (the caller must revoke it). Elsewhere the same-origin URL is returned.
 * @param {string} href rendition link href
 * @returns {Promise<string>}
 */
export async function loadRenditionUrl(href) {
  const src = toPathname(href);
  if (!src || !isLocal()) return src;

  const response = await fetch(src, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`Unable to load rendition: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
