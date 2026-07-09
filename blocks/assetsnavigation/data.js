import { fetchAssetsList, displayLabel, DAM_ROOT } from '../../scripts/assets-api.js';

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
