/*
 * Interaction wiring for the assets listing view.
 *
 * A single delegated click handler on the block covers every control (folder
 * cards, breadcrumb links, the filters toggle and the view-mode toggle) so the
 * markup can be re-rendered on navigation without rebinding listeners.
 */

import { navigate, getRoute } from '../../scripts/router.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
import { DAM_ROOT } from './data.js';
import { setUiState } from './state.js';

/**
 * Reflects the current UI state onto the block via data attributes. The CSS
 * keys the layout (filters panel visibility, grid vs list) off these, and the
 * toggle controls read them back to stay in sync.
 * @param {Element} block
 * @param {{ filtersOpen: boolean, viewMode: string }} ui
 */
export function applyUiState(block, ui) {
  block.dataset.filtersOpen = String(ui.filtersOpen);
  block.dataset.viewMode = ui.viewMode;

  const filtersToggle = block.querySelector('.assetslisting-filters-toggle');
  if (filtersToggle) filtersToggle.setAttribute('aria-expanded', String(ui.filtersOpen));

  block.querySelectorAll('.assetslisting-viewtoggle-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.viewMode === ui.viewMode));
  });
}

/**
 * Binds the delegated click handler once. `getUi`/`setUi` let the handler read
 * and update the live UI state owned by the block controller.
 * @param {Element} block
 * @param {{
 *   getUi: () => object, setUi: (ui: object) => void,
 *   openAsset: (path: string) => void
 * }} controller
 */
export default function bindAssetsListing(block, { getUi, setUi, openAsset }) {
  block.addEventListener('click', (event) => {
    const folderCard = event.target.closest('.assetslisting-card-folder');
    if (folderCard && folderCard.dataset.href) {
      navigate({ view: ASSETS_LISTING_VIEW, path: folderCard.dataset.href });
      return;
    }

    const assetCard = event.target.closest('.assetslisting-card-asset');
    if (assetCard && assetCard.dataset.assetPath) {
      openAsset(assetCard.dataset.assetPath);
      return;
    }

    const crumb = event.target.closest('.assetslisting-breadcrumb-link');
    if (crumb && crumb.dataset.href) {
      navigate({ view: ASSETS_LISTING_VIEW, path: crumb.dataset.href });
      return;
    }

    const uploadButton = event.target.closest('[data-action="upload"]');
    if (uploadButton) {
      const path = getRoute().path || DAM_ROOT;
      // Lazy-load the upload mini-flow: it is only needed on demand.
      import('./sections/upload/upload.js').then(({ default: openUploadModal }) => {
        openUploadModal(block, path);
      });
      return;
    }

    const filtersToggle = event.target.closest('.assetslisting-filters-toggle');
    if (filtersToggle) {
      const ui = setUiState({ filtersOpen: !getUi().filtersOpen });
      setUi(ui);
      applyUiState(block, ui);
      return;
    }

    const viewButton = event.target.closest('.assetslisting-viewtoggle-button');
    if (viewButton && viewButton.dataset.viewMode) {
      const ui = setUiState({ viewMode: viewButton.dataset.viewMode });
      setUi(ui);
      applyUiState(block, ui);
    }
  });

  // Keyboard activation for the focusable asset cards (role="button").
  block.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const assetCard = event.target.closest('.assetslisting-card-asset');
    if (assetCard && assetCard.dataset.assetPath) {
      event.preventDefault();
      openAsset(assetCard.dataset.assetPath);
    }
  });
}
