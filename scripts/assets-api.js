/*
 * Reusable client for the Assets Hub custom listing endpoint
 * (/bin/assetshub/assets/list), backed by a Sling servlet that runs on the
 * request's own session (respects the caller's DAM ACLs) and lists direct
 * folders and assets under a given /content/dam path.
 *
 * Requests are made same-origin so they flow through whatever serves the app.
 * Any authentication required is the serving layer's concern and must never be
 * embedded here — this is public client-side code.
 */

export const DAM_ROOT = '/content/dam';

const LIST_ENDPOINT = '/bin/assetshub/assets/list';

/**
 * Fetches the folders and assets directly under a DAM path.
 * @param {string} [path] JCR path under /content/dam; defaults to /content/dam
 * @returns {Promise<{ path: string, folders: Array, assets: Array }>}
 */
export async function fetchAssetsList(path = DAM_ROOT) {
  const url = new URL(LIST_ENDPOINT, window.location);
  url.searchParams.set('path', path);
  const response = await fetch(`${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new Error(`Unable to load assets: ${response.status}`);
  }
  return response.json();
}

/**
 * Reveals the child folders of several paths in a single request, so the tree
 * can be expanded down to a deep path without an N-level request waterfall.
 * @param {string[]} paths JCR folder paths to reveal
 * @returns {Promise<{ levels: Object<string, Array> }>}
 */
export async function fetchAssetsReveal(paths) {
  const url = new URL(LIST_ENDPOINT, window.location);
  url.searchParams.set('reveal', paths.join(','));
  const response = await fetch(`${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new Error(`Unable to load folder tree: ${response.status}`);
  }
  return response.json();
}

/**
 * Display label for a folder or asset entry: its authored title when present,
 * falling back to its node name.
 * @param {{ title?: string, name: string }} item
 * @returns {string}
 */
export function displayLabel(item) {
  return item.title || item.name;
}

const FORMAT_LABELS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mpeg': 'mp3',
  'application/pdf': 'pdf',
};

/**
 * Short extension-style label for an asset's dc:format mimetype
 * (e.g. "image/jpeg" -> "jpg"), falling back to the mimetype subtype.
 * @param {string} [format] dc:format value
 * @returns {string}
 */
export function formatLabel(format) {
  if (!format) return '';
  return FORMAT_LABELS[format] || format.split('/').pop().split('+')[0];
}
