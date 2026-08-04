/*
 * Data helpers for the assets listing view.
 *
 * The listing fetch itself lives in the shared assets-api client; this module
 * adds the view-specific derivations (folder title, breadcrumb trail) so the
 * section builders stay free of path arithmetic.
 */

import {
  fetchAssetsList,
  fetchAssetDetail,
  displayLabel,
  formatLabel,
  formatSizeMb,
  formatDate,
  isPreviewable,
  assetIconUrl,
  DAM_ROOT,
} from '../../scripts/assets-api.js';
import { fetchCollectionItems } from '../../scripts/collections-api.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';

export {
  fetchAssetsList,
  fetchAssetDetail,
  fetchCollectionItems,
  displayLabel,
  formatLabel,
  formatSizeMb,
  formatDate,
  isPreviewable,
  assetIconUrl,
  DAM_ROOT,
};

/**
 * Annotates each folder with its own direct (non-recursive) asset count. The
 * listing endpoint has no dedicated count field, so this fetches every
 * visible folder's own listing in parallel — one extra request per folder —
 * and counts its `assets`. A folder that only contains sub-folders (no
 * assets of its own) genuinely gets 0, not a placeholder: a folder full of
 * folders and one with no data available would otherwise look identical.
 * @param {Array<{ path: string }>} folders
 * @returns {Promise<Array>} the same folders, each with `assetCount` set
 */
export async function withFolderAssetCounts(folders) {
  const counts = await Promise.all(folders.map((folder) => fetchAssetsList(folder.path)
    .then((data) => (data.assets || []).length)
    .catch(() => 0)));
  return folders.map((folder, index) => ({ ...folder, assetCount: counts[index] }));
}

const ROOT_LABEL = 'Todos los assets';
export const PRODUCT_LABEL = 'Digital Asset Management';
// First breadcrumb crumb inside a DAM sub-folder: links back to "Todos los
// assets" (the DAM root), same target as the left-nav entry.
const HOME_LABEL = 'Todos';

/**
 * Human label for a DAM path segment. Titles are not available for the ancestor
 * paths in a breadcrumb (only their node names), so fall back to a capitalized
 * node name.
 * @param {string} segment JCR node name
 * @returns {string}
 */
function segmentLabel(segment) {
  if (!segment) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** A route into the assets-listing view at a DAM path (no collection context). */
function damRoute(path) {
  return { view: ASSETS_LISTING_VIEW, path };
}

/**
 * Title shown as the current heading in the actions bar. Inside a collection the
 * collection's own title is the root heading; a sub-folder shows its node name.
 * @param {string} path JCR path under /content/dam (may be empty at a collection root)
 * @param {{ id: string, label: string }|null} [collection]
 * @returns {string}
 */
export function folderTitle(path, collection = null) {
  if (collection && (!path || path === DAM_ROOT)) return collection.label;
  if (!path || path === DAM_ROOT) return ROOT_LABEL;
  return segmentLabel(path.split('/').pop());
}

/**
 * Builds the DAM folder breadcrumb as a list of `{ label, route, current, home }`.
 * Only rendered while browsing a DAM sub-folder — the root shows the product
 * label and collections show an asset counter instead (see createActionsBar) —
 * so the trail always leads with the "Todos" home crumb (flagged `home`, linking
 * back to the DAM root) followed by one crumb per path segment. The current
 * (last) crumb has a null route so the renderer draws it inert.
 * @param {string} path JCR path under /content/dam
 * @returns {Array<{ label: string, route: Object|null, current: boolean, home?: boolean }>}
 */
export function breadcrumbTrail(path) {
  const trail = [{
    label: HOME_LABEL, route: damRoute(DAM_ROOT), current: false, home: true,
  }];

  if (!path || path === DAM_ROOT || !path.startsWith(`${DAM_ROOT}/`)) {
    return trail;
  }

  const rest = path.slice(DAM_ROOT.length + 1).split('/').filter(Boolean);
  let acc = DAM_ROOT;
  rest.forEach((segment, index) => {
    acc += `/${segment}`;
    const current = index === rest.length - 1;
    trail.push({ label: segmentLabel(segment), route: current ? null : damRoute(acc), current });
  });

  return trail;
}
