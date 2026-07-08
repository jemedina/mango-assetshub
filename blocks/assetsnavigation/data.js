import {
  fetchAssets,
  isFolderEntity,
  getLinkHref,
  toPathname,
} from '../../scripts/assets-api.js';

export const primaryNavItems = [
  { id: 'all-assets', label: 'Todos los assets', view: 'assets-listing' },
  { id: 'recent', label: 'Recientes', view: 'recents' },
  { id: 'recent-downloads', label: 'Descargas recientes', view: 'recent-downloads' },
];

export const AUTH_STATUS_PATH = '/bin/assetshub/auth/status';

export async function fetchAuthStatus(path = AUTH_STATUS_PATH) {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load auth status: ${response.status}`);
  }

  return response.json();
}

function isVisibleFolder(entity) {
  return isFolderEntity(entity) && entity.properties?.hidden !== 'true';
}

function toFolder(entity) {
  const name = entity.properties?.name || 'Untitled';
  const href = toPathname(getLinkHref(entity, 'self'));

  return {
    id: href || name,
    label: name,
    href,
  };
}

export async function fetchFolders(path = '/api/assets.json') {
  const data = await fetchAssets(path);
  return (data.entities || [])
    .filter(isVisibleFolder)
    .map(toFolder);
}
