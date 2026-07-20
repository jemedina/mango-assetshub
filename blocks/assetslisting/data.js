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

const ROOT_LABEL = 'Todos los assets';
const PRODUCT_LABEL = 'Digital Asset Management';
const COLLECTIONS_LABEL = 'Colecciones';

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

/** A route into the assets-listing view within a collection, at a DAM path (or its root). */
function collectionRoute(collection, path) {
  const filters = { collection: collection.id, collabel: collection.label };
  const route = { view: ASSETS_LISTING_VIEW, filters };
  if (path) route.path = path;
  return route;
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

/** Breadcrumb from "Digital Asset Management" (DAM root) down to the current folder. */
function damTrail(path) {
  const atRoot = !path || path === DAM_ROOT;
  const trail = [{
    label: PRODUCT_LABEL, route: atRoot ? null : damRoute(DAM_ROOT), current: atRoot,
  }];

  if (atRoot || !path.startsWith(`${DAM_ROOT}/`)) {
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

function collectionTrail(collection, path) {
  const atRoot = !path || path === DAM_ROOT;
  const collectionCrumb = {
    label: collection.label,
    route: atRoot ? null : collectionRoute(collection, ''),
    current: atRoot,
  };
  const trail = [
    { label: COLLECTIONS_LABEL, route: damRoute(DAM_ROOT), current: false },
    collectionCrumb,
  ];

  if (atRoot || !path.startsWith(`${DAM_ROOT}/`)) {
    return trail;
  }

  const rest = path.slice(DAM_ROOT.length + 1).split('/').filter(Boolean);
  let acc = DAM_ROOT;
  rest.forEach((segment, index) => {
    acc += `/${segment}`;
    const current = index === rest.length - 1;
    trail.push({
      label: segmentLabel(segment),
      route: current ? null : collectionRoute(collection, acc),
      current,
    });
  });

  return trail;
}

/**
 * Builds the breadcrumb trail as a list of `{ label, route, current }`. Two
 * shapes:
 *  - DAM: "Digital Asset Management" (root) down to the current folder.
 *  - Collection: "Colecciones" › "<collection>" › sub-folder segments — rooted
 *    at the collection, not /content/dam, so the editor always sees the
 *    collection as the parent of where it is.
 * The current (last) crumb has a null route so the renderer draws it inert.
 * @param {string} path JCR path under /content/dam (may be empty in a collection)
 * @param {{ id: string, label: string }|null} [collection]
 * @returns {Array<{ label: string, route: Object|null, current: boolean }>}
 */
export function breadcrumbTrail(path, collection = null) {
  return collection ? collectionTrail(collection, path) : damTrail(path);
}
