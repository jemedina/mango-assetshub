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

function getSelfHref(entity) {
  return entity.links?.find((link) => link.rel?.includes('self'))?.href;
}

function isVisibleFolder(entity) {
  return entity.class?.includes('assets/folder') && entity.properties?.hidden !== 'true';
}

function toFolder(entity) {
  const name = entity.properties?.name || 'Untitled';
  const href = getSelfHref(entity);

  return {
    id: href || name,
    label: name,
    href: href ? new URL(href, window.location).pathname : '',
  };
}

export async function fetchFolders(path = '/api/assets.json') {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load folders: ${response.status}`);
  }

  const data = await response.json();
  return (data.entities || [])
    .filter(isVisibleFolder)
    .map(toFolder);
}
