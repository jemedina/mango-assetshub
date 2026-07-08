export const primaryNavItems = [
  { id: 'all-assets', label: 'Todos los assets' },
  { id: 'recent', label: 'Recientes' },
  { id: 'recent-downloads', label: 'Descargas recientes' },
];

export const user = {
  name: 'Mango User',
  profile: 'Admin',
};

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
