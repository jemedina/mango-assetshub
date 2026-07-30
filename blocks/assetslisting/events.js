/*
 * Interaction wiring for the assets listing view.
 *
 * A single delegated click handler on the block covers every control
 * (breadcrumb links, the filters toggle and the view-mode toggle) so the
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
 *   isSelectionMode: () => boolean, enterSelectionMode: () => void,
 *   toggleSelectionMode: () => void,
 *   toggleSelect: (path: string) => void, clearSelection: () => void,
 *   closeSelection: () => void, downloadSelected: () => void,
 *   setSearchText: (value: string) => void, filtersChanged: () => void,
 *   clearFilters: () => void
 * }} controller
 */
export default function bindAssetsListing(block, {
  getUi, setUi, openAsset, renderSorted,
  isSelectionMode, enterSelectionMode, toggleSelectionMode, toggleSelect,
  clearSelection, closeSelection, downloadSelected,
  setSearchText, filtersChanged, clearFilters,
}) {
  block.addEventListener('click', (event) => {
    const check = event.target.closest('.assetslisting-check');
    const checkCard = check && check.closest('.assetslisting-card-asset, .assetslisting-card-folder');
    const checkPath = checkCard && (checkCard.dataset.assetPath || checkCard.dataset.href);
    if (checkCard && checkPath) {
      // The checkbox is how selection mode gets triggered in grid view (a
      // click activates it if it wasn't already on) and always toggles that
      // one item's pick state — folders included, a folder pick shares the
      // whole folder. Several items can be picked at once this way, in both
      // grid and list view.
      enterSelectionMode();
      toggleSelect(checkPath);
      return;
    }

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
      // In selection mode the detail panel must never open — every click on
      // the card (not just the checkbox) picks/unpicks instead.
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

    if (event.target.closest('[data-action="view-all"]')) {
      navigate({ view: ASSETS_LISTING_VIEW, path: DAM_ROOT });
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

    if (event.target.closest('.assetslisting-filters-close')) {
      const ui = setUiState({ filtersOpen: false });
      setUi(ui);
      applyUiState(block, ui);
      return;
    }

    if (event.target.closest('.assetslisting-filters-clear')) {
      clearFilters();
      return;
    }

    // Collapsing a filter section is pure disclosure: it hides the controls but
    // never deactivates the values they hold.
    const filterHeader = event.target.closest('.assetslisting-filter-header');
    if (filterHeader) {
      const expanded = filterHeader.getAttribute('aria-expanded') === 'true';
      filterHeader.setAttribute('aria-expanded', String(!expanded));
      const body = filterHeader.closest('.assetslisting-filter')?.querySelector('.assetslisting-filter-body');
      if (body) body.hidden = expanded;
      return;
    }

    const chip = event.target.closest('.assetslisting-filter-chip');
    if (chip) {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      filtersChanged();
      return;
    }

    const viewButton = event.target.closest('.assetslisting-viewtoggle-button');
    if (viewButton && viewButton.dataset.viewMode) {
      const ui = setUiState({ viewMode: viewButton.dataset.viewMode });
      setUi(ui);
      applyUiState(block, ui);
      // Grid and list view build different markup (see content.js: list is
      // one flat table, grid splits into labeled Subcarpetas/Archivos
      // sections), so switching modes needs an actual re-render, not just a
      // CSS flip.
      renderSorted();
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

  // Typing is debounced: the search box (and the free-text filter fields) fire
  // a query per pause, not per keystroke. A single shared timer is enough — the
  // user types in one field at a time and every path refetches the same listing.
  let typeDebounce;
  block.addEventListener('input', (event) => {
    const searchInput = event.target.closest('.assetslisting-search-input');
    if (searchInput) {
      clearTimeout(typeDebounce);
      typeDebounce = setTimeout(() => setSearchText(searchInput.value), 300);
      return;
    }
    if (event.target.closest('.assetslisting-filter-text')) {
      clearTimeout(typeDebounce);
      typeDebounce = setTimeout(() => filtersChanged(), 300);
    }
  });

  // Discrete filter controls (checkboxes, radios, dates) apply on change; the
  // text fields are handled above through the debounced input path.
  block.addEventListener('change', (event) => {
    if (event.target.closest('.assetslisting-filter')
        && !event.target.closest('.assetslisting-filter-text')) {
      filtersChanged();
    }
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
