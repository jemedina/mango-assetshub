/*
 * Single source of truth for the SPA view ids and their fragment paths.
 *
 * Kept dependency-free so both the hub (scripts/hub.js) and the blocks that
 * navigate between views (assetslisting, assetsnavigation) can import it
 * without creating module cycles. To add a view: register it here and create
 * its fragment under /hub-fragments/<view>; nothing else needs to change.
 */

/**
 * View id of the assets listing — the view blocks navigate to most. It also
 * renders an open collection (folders + assets) when the route carries a
 * `collection` filter; the block reuses the same grid and only swaps the data
 * source and breadcrumb, so no separate view/fragment is needed.
 */
export const ASSETS_LISTING_VIEW = 'assets-listing';

/** View loaded when the route has no (or an unknown) view. */
export const DEFAULT_VIEW = ASSETS_LISTING_VIEW;

/** Registry of SPA views mapped to their fragment path. */
export const HUB_VIEWS = {
  [ASSETS_LISTING_VIEW]: { fragment: '/hub-fragments/assets-listing' },
  recents: { fragment: '/hub-fragments/recents' },
  'recent-downloads': { fragment: '/hub-fragments/recent-downloads' },
};
