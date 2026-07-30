/*
 * Data helpers for the navigation block: the primary nav registry and
 * folder-tree fetches mapped to the shape the renderers expect
 * ({ id, label, href, hasChildren }). The session/login flow lives in the
 * app-wide scripts/auth.js.
 */

import {
  fetchAssetsList,
  fetchAssetsReveal,
  displayLabel,
  DAM_ROOT,
} from '../../scripts/assets-api.js';
import { fetchCollections } from '../../scripts/collections-api.js';

// Icons come from the project-wide `.ah-icon` system (styles/icons.css): each
// item names an icon class, the renderer builds `<span class="ah-icon {class}">`.
export const primaryNavItems = [
  {
    id: 'all-assets', label: 'Todos los assets', view: 'assets-listing', iconClass: 'ah-icon-all-assets',
  },
  {
    id: 'recent-downloads', label: 'Descargas recientes', view: 'recent-downloads', iconClass: 'ah-icon-recent-downloads',
  },
];

/** Group label used when the backend sends no group (older payloads / fallback). */
export const FALLBACK_COLLECTION_GROUP = 'Otras colecciones';

/**
 * Collections for the sidebar, bucketed into the single-level groups the backend
 * assigns (by a "starts with" match on the title, configured in OSGi). Returns an
 * ordered list of groups — the order comes from the backend's `groups` array
 * (configured rule order, fallback last), and each group carries the collections
 * that landed in it, in the order the backend listed them.
 *
 * Reads the publish bridge, so it includes the private collections the current
 * user may see. Empty groups are never returned.
 * @returns {Promise<Array<{ label: string, collections:
 *   Array<{ id: string, label: string, public: boolean }> }>>}
 */
export async function fetchCollectionsNav() {
  const data = await fetchCollections();
  const collections = (data.collections || []).map((collection) => ({
    id: collection.id,
    label: collection.title || collection.id,
    public: Boolean(collection.public),
    group: collection.group || FALLBACK_COLLECTION_GROUP,
  }));

  // Group order: the backend's ordered `groups` when present, else the order the
  // collections first appear in. Bucket keeps the backend's per-group order.
  const order = Array.isArray(data.groups) && data.groups.length
    ? data.groups.map((group) => group.label)
    : [...new Set(collections.map((collection) => collection.group))];

  const buckets = new Map(order.map((label) => [label, []]));
  collections.forEach((collection) => {
    if (!buckets.has(collection.group)) buckets.set(collection.group, []);
    buckets.get(collection.group).push(collection);
  });

  return [...buckets.entries()]
    .filter(([, items]) => items.length)
    .map(([label, items]) => ({ label, collections: items }));
}

/**
 * Display name + avatar initials for the user footer, built from the auth
 * profile. Falls back gracefully when given/family name aren't populated yet
 * (e.g. an identity provider that only sends userId) so the avatar layout still
 * renders correctly — just with a single-letter initial — until the backend
 * fills in the full profile.
 * When the profile carries a synced avatar (`photo`, a data URI from the auth
 * status servlet) it's passed through so the footer can render the real
 * thumbnail; otherwise the initials stand in.
 * @param {{ userId: string, profile?: {
 *   givenName?: string, familyName?: string, photo?: string } }} status
 * @returns {{ name: string, initials: string, photo: string|null }}
 */
export function userDisplay(status) {
  const { givenName, familyName, photo } = status.profile || {};
  const name = givenName ? `${givenName} ${familyName || ''}`.trim() : status.userId;
  const initials = givenName && familyName
    ? `${givenName[0]}${familyName[0]}`
    : (givenName || status.userId || '?')[0];
  return { name, initials: initials.toUpperCase(), photo: photo || null };
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
