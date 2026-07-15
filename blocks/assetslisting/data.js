/*
 * Data helpers for the assets listing view.
 *
 * The listing fetch itself lives in the shared assets-api client; this module
 * adds the view-specific derivations (folder title, breadcrumb trail) so the
 * render layer stays free of path arithmetic.
 */

import {
  fetchAssetsList,
  displayLabel,
  formatLabel,
  DAM_ROOT,
} from '../../scripts/assets-api.js';

export {
  fetchAssetsList, displayLabel, formatLabel, DAM_ROOT,
};

const ROOT_LABEL = 'Todos';

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

/**
 * Title shown as the current-folder heading in the actions bar.
 * @param {string} path JCR path under /content/dam
 * @returns {string}
 */
export function folderTitle(path) {
  if (!path || path === DAM_ROOT) return ROOT_LABEL;
  return segmentLabel(path.split('/').pop());
}

/**
 * Builds the breadcrumb trail from /content/dam down to the current path.
 * The first crumb ("Todos") always points at the DAM root; the last crumb is
 * the current folder and is flagged so the renderer can render it inert.
 * @param {string} path JCR path under /content/dam
 * @returns {Array<{ label: string, path: string, current: boolean }>}
 */
export function breadcrumbTrail(path) {
  const trail = [{ label: ROOT_LABEL, path: DAM_ROOT, current: !path || path === DAM_ROOT }];

  if (!path || path === DAM_ROOT || !path.startsWith(`${DAM_ROOT}/`)) {
    return trail;
  }

  const rest = path.slice(DAM_ROOT.length + 1).split('/').filter(Boolean);
  let acc = DAM_ROOT;
  rest.forEach((segment, index) => {
    acc += `/${segment}`;
    trail.push({
      label: segmentLabel(segment),
      path: acc,
      current: index === rest.length - 1,
    });
  });

  return trail;
}
