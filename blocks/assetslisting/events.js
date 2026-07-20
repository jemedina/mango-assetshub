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
import {
  isDropdownOpen, openDropdown, closeDropdown, closeAllDropdowns,
} from './sections/dropdown.js';
import { SORT_FIELDS } from './shared/sort.js';

/**
 * Reflects the current sort field/direction onto the sort control: the
 * trigger's label, the direction button's rotation, and which menu item is
 * marked current.
 * @param {Element} block
 * @param {{ sortField: string, sortDirection: 'asc'|'desc' }} ui
 */
export function applySortState(block, ui) {
  const current = SORT_FIELDS.find(({ field }) => field === ui.sortField) || SORT_FIELDS[0];

  const label = block.querySelector('.assetslisting-sort-trigger .btn-label');
  if (label) label.textContent = current.label;

  const direction = block.querySelector('.assetslisting-sort-direction');
  if (direction) {
    direction.dataset.direction = ui.sortDirection;
    direction.setAttribute(
      'aria-label',
      ui.sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente',
    );
    direction.textContent = ui.sortDirection === 'asc' ? 'ASC' : 'DESC';
  }

  block.querySelectorAll('.assetslisting-sort-option').forEach((option) => {
    option.setAttribute('aria-current', String(option.dataset.sortField === ui.sortField));
  });
}

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

  applySortState(block, ui);
}

/**
 * Binds the delegated click handler once. `getUi`/`setUi` let the handler read
 * and update the live UI state owned by the block controller.
 * @param {Element} block
 * @param {{
 *   getUi: () => object, setUi: (ui: object) => void,
 *   openAsset: (path: string) => void, renderSorted: () => void,
 *   isSelectionMode: () => boolean, toggleSelectionMode: () => void,
 *   toggleSelect: (path: string) => void, clearSelection: () => void,
 *   closeSelection: () => void, downloadSelected: () => void
 * }} controller
 */
export default function bindAssetsListing(block, {
  getUi, setUi, openAsset, renderSorted,
  isSelectionMode, toggleSelectionMode, toggleSelect,
  clearSelection, closeSelection, downloadSelected,
}) {
  block.addEventListener('click', (event) => {
    const folderCard = event.target.closest('.assetslisting-card-folder');
    if (folderCard && folderCard.dataset.href) {
      // In selection mode a folder click picks/unpicks the whole folder (a
      // folder selection shares it complete); outside it, it navigates — and
      // navigating exits selection mode implicitly: the shell rebuilds per folder.
      if (isSelectionMode()) {
        toggleSelect(folderCard.dataset.href);
      } else {
        // Inside a collection, keep the collection context so the breadcrumb
        // stays rooted at it as the user steps into member folders.
        const { filters } = getRoute();
        const carry = filters.collection
          ? { collection: filters.collection, collabel: filters.collabel }
          : {};
        navigate({ view: ASSETS_LISTING_VIEW, path: folderCard.dataset.href, filters: carry });
      }
      return;
    }

    const assetCard = event.target.closest('.assetslisting-card-asset');
    if (assetCard && assetCard.dataset.assetPath) {
      // In selection mode a card click only picks/unpicks; it no longer opens.
      if (isSelectionMode()) toggleSelect(assetCard.dataset.assetPath);
      else openAsset(assetCard.dataset.assetPath);
      return;
    }

    const crumb = event.target.closest('.assetslisting-breadcrumb-link');
    if (crumb && crumb.dataset.route) {
      try {
        navigate(JSON.parse(crumb.dataset.route));
      } catch {
        // ignore malformed route payloads
      }
      return;
    }

    if (event.target.closest('[data-action="select"]')) {
      toggleSelectionMode();
      return;
    }

    if (event.target.closest('[data-action="selection-clear"]')) {
      clearSelection();
      return;
    }

    if (event.target.closest('[data-action="selection-close"]')) {
      closeSelection();
      return;
    }

    if (event.target.closest('[data-action="selection-download"]')) {
      downloadSelected();
      return;
    }

    if (event.target.closest('[data-action="selection-edit"]')) {
      // Bulk edit is a placeholder for now, mirroring the detail panel's edit.
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
      return;
    }

    const sortDirection = event.target.closest('.assetslisting-sort-direction');
    if (sortDirection) {
      const ui = setUiState({ sortDirection: getUi().sortDirection === 'asc' ? 'desc' : 'asc' });
      setUi(ui);
      applySortState(block, ui);
      renderSorted();
      return;
    }

    const sortOption = event.target.closest('.assetslisting-sort-option');
    if (sortOption && sortOption.dataset.sortField) {
      const ui = setUiState({ sortField: sortOption.dataset.sortField });
      setUi(ui);
      applySortState(block, ui);
      closeAllDropdowns(block);
      renderSorted();
      return;
    }

    const sortTrigger = event.target.closest('.assetslisting-sort-trigger');
    if (sortTrigger) {
      const panel = sortTrigger.closest('.dropdown')?.querySelector('.dropdown-panel');
      if (panel) {
        if (isDropdownOpen(sortTrigger)) closeDropdown(sortTrigger, panel);
        else openDropdown(sortTrigger, panel);
      }
      return;
    }

    // Any other click inside the block closes open dropdowns (click-outside
    // for anything that isn't a dropdown control itself).
    if (!event.target.closest('.dropdown')) closeAllDropdowns(block);
  });

  // Click-outside (outside the block entirely) and Escape both close open menus.
  document.addEventListener('click', (event) => {
    if (!block.contains(event.target)) closeAllDropdowns(block);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllDropdowns(block);
  });

  // Keyboard activation for the focusable asset cards (role="button").
  block.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const assetCard = event.target.closest('.assetslisting-card-asset');
    if (assetCard && assetCard.dataset.assetPath) {
      event.preventDefault();
      if (isSelectionMode()) toggleSelect(assetCard.dataset.assetPath);
      else openAsset(assetCard.dataset.assetPath);
    }
  });
}
