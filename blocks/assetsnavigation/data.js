/*
 * Data helpers for the navigation block: the primary nav registry, the auth
 * status / login flow, and folder-tree fetches mapped to the shape the
 * renderers expect ({ id, label, href, hasChildren }).
 */

import {
  fetchAssetsList,
  fetchAssetsReveal,
  displayLabel,
  DAM_ROOT,
} from '../../scripts/assets-api.js';
import { fetchCollections } from '../../scripts/collections-api.js';
import { ICON_ALL_ASSETS, ICON_RECENT, ICON_RECENT_DOWNLOADS } from './icons.js';

export const primaryNavItems = [
  {
    id: 'all-assets', label: 'Todos los assets', view: 'assets-listing', icon: ICON_ALL_ASSETS,
  },
  {
    id: 'recent', label: 'Recientes', view: 'recents', icon: ICON_RECENT,
  },
  {
    id: 'recent-downloads', label: 'Descargas recientes', view: 'recent-downloads', icon: ICON_RECENT_DOWNLOADS,
  },
];

/**
 * Collections for the sidebar section, mapped to the nav item shape
 * ({ id, label, public }). Reads the publish bridge, so it includes the private
 * collections the current user may see.
 * @returns {Promise<Array<{ id: string, label: string, public: boolean }>>}
 */
export async function fetchCollectionsNav() {
  const data = await fetchCollections();
  return (data.collections || []).map((collection) => ({
    id: collection.id,
    label: collection.title || collection.id,
    public: Boolean(collection.public),
  }));
}

export const AUTH_STATUS_PATH = '/bin/assetshub/auth/status';

// Protected login servlet (LoginServlet). Navigating STRAIGHT to it — a
// protected route — triggers the AEM/IMS login, and once authenticated AEM
// replays the request so the servlet redirects the user back to the saved
// target. Going directly, with no intermediate redirect, mirrors the flow that
// reliably completes the IMS login (an extra redirect hop in front of it broke
// the round-trip).
export const LOGIN_PATH = '/bin/assetshub/auth/login';

const REDIRECT_COOKIE = 'mango-login-redirect';

export async function fetchAuthStatus(path = AUTH_STATUS_PATH) {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load auth status: ${response.status}`);
  }

  return response.json();
}

// The auth status endpoint has no role/title field yet (only profile, groups,
// permissions) — placeholder until the backend surfaces something to map to
// a display role. Swap this for a real value (e.g. derived from `groups`)
// once it does.
const PLACEHOLDER_ROLE = 'Miembro';

/**
 * Display name + avatar initials + role for the user footer, built from the
 * auth profile. Falls back gracefully when given/family name aren't populated
 * yet (e.g. an identity provider that only sends userId) so the avatar layout
 * still renders correctly — just with a single-letter initial — until the
 * backend fills in the full profile.
 * @param {{ userId: string, profile?: { givenName?: string, familyName?: string } }} status
 * @returns {{ name: string, initials: string, role: string }}
 */
export function userDisplay(status) {
  const { givenName, familyName } = status.profile || {};
  const name = givenName ? `${givenName} ${familyName || ''}`.trim() : status.userId;
  const initials = givenName && familyName
    ? `${givenName[0]}${familyName[0]}`
    : (givenName || status.userId || '?')[0];
  return { name, initials: initials.toUpperCase(), role: PLACEHOLDER_ROLE };
}

/**
 * Starts login. Remembers the current location — path, query and hash, so the
 * hash-based SPA view (see scripts/router.js) is restored — in a cookie the
 * login servlet reads, then navigates straight to the protected login route to
 * trigger the AEM/IMS login. On return the servlet (or, as a fallback, the EDS
 * client-side restore in scripts/login-return.js) sends the user back here.
 */
export function startLogin() {
  const {
    pathname, search, hash, protocol,
  } = window.location;
  const returnTo = `${pathname}${search}${hash}`;
  const secure = protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REDIRECT_COOKIE}=${encodeURIComponent(returnTo)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
  window.location.assign(LOGIN_PATH);
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
