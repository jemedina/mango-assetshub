import {
  fetchAssetsList,
  fetchAssetsReveal,
  displayLabel,
  DAM_ROOT,
} from '../../scripts/assets-api.js';

export const primaryNavItems = [
  { id: 'all-assets', label: 'Todos los assets', view: 'assets-listing' },
  { id: 'recent', label: 'Recientes', view: 'recents' },
  { id: 'recent-downloads', label: 'Descargas recientes', view: 'recent-downloads' },
];

export const AUTH_STATUS_PATH = '/bin/assetshub/auth/status';

// Protected callback servlet (LoginCallbackServlet). Navigating STRAIGHT to it —
// a protected route — triggers the AEM/IMS login, and once authenticated AEM
// replays the request so the servlet redirects the user back. Going directly,
// with no intermediate redirect, mirrors the flow that reliably completes the
// IMS login (an extra redirect hop in front of it broke the round-trip).
export const LOGIN_CALLBACK_PATH = '/bin/assetshub/auth/callback';

const REDIRECT_COOKIE = 'mango-login-redirect';

export async function fetchAuthStatus(path = AUTH_STATUS_PATH) {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load auth status: ${response.status}`);
  }

  return response.json();
}

/**
 * Starts login. Remembers the current location — path, query and hash, so the
 * hash-based SPA view (see scripts/router.js) is restored — in a cookie the
 * callback reads, then navigates straight to the protected callback route to
 * trigger the AEM/IMS login. On return the callback (or, as a fallback, the EDS
 * client-side restore in scripts/login-return.js) sends the user back here.
 */
export function startLogin() {
  const {
    pathname, search, hash, protocol,
  } = window.location;
  const returnTo = `${pathname}${search}${hash}`;
  const secure = protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REDIRECT_COOKIE}=${encodeURIComponent(returnTo)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
  window.location.assign(LOGIN_CALLBACK_PATH);
}

function toFolder(folder) {
  return {
    id: folder.path,
    label: displayLabel(folder),
    href: folder.path,
    hasChildren: folder.hasChildren,
  };
}

export async function fetchFolders(path = DAM_ROOT) {
  const data = await fetchAssetsList(path);
  return (data.folders || []).map(toFolder);
}

/**
 * Ordered ancestor folder paths that must be expanded to reveal `path`, from the
 * DAM root down to (but not including) `path` itself.
 * @param {string} path e.g. /content/dam/a/b/c
 * @returns {string[]} e.g. [/content/dam, /content/dam/a, /content/dam/a/b]
 */
export function ancestorPaths(path) {
  if (!path || !path.startsWith(`${DAM_ROOT}/`)) {
    return [DAM_ROOT];
  }
  const segments = path.slice(DAM_ROOT.length + 1).split('/');
  const result = [DAM_ROOT];
  let current = DAM_ROOT;
  for (let i = 0; i < segments.length - 1; i += 1) {
    current = `${current}/${segments[i]}`;
    result.push(current);
  }
  return result;
}

/**
 * Reveals the child folders of several paths in one request, mapped to the nav
 * folder shape and keyed by path.
 * @param {string[]} paths
 * @returns {Promise<Object<string, Array>>}
 */
export async function fetchFoldersReveal(paths) {
  const data = await fetchAssetsReveal(paths);
  const levels = {};
  Object.entries(data.levels || {}).forEach(([path, folders]) => {
    levels[path] = folders.map(toFolder);
  });
  return levels;
}
