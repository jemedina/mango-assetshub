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

// Unprotected login gate (Sling servlet). It stores the return destination in a
// cookie and hands off to the protected callback, which forces the AEM login and
// then bounces the user back here. See MangoAssetsManager LoginRedirectServlet.
export const LOGIN_PATH = '/bin/assetshub/auth/login';

export async function fetchAuthStatus(path = AUTH_STATUS_PATH) {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load auth status: ${response.status}`);
  }

  return response.json();
}

/**
 * Builds the URL of the login gate, carrying the user's current location as the
 * post-login destination and the current host as the cookie domain.
 *
 * The whole client-side location — path, query and hash — is sent as `redirect`,
 * so the hash-based SPA view (see scripts/router.js) is restored after login.
 * The gate validates it to a same-origin path before use.
 * @returns {string} same-origin path, e.g. /bin/assetshub/auth/login?redirect=...&domain=...
 */
export function buildLoginUrl() {
  const {
    pathname, search, hash, hostname,
  } = window.location;
  const url = new URL(LOGIN_PATH, window.location);
  url.searchParams.set('redirect', `${pathname}${search}${hash}`);
  if (hostname) {
    url.searchParams.set('domain', hostname);
  }
  return `${url.pathname}${url.search}`;
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
