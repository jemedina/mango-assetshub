import { getRoute, subscribeRoute } from '../../scripts/router.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import {
  fetchAssetsList, fetchCollectionItems, displayLabel, DAM_ROOT,
} from './data.js';
import { fetchSearchFilters, searchAssets } from '../../scripts/assets-api.js';
import { renderShell, renderContent, createState } from './sections/index.js';
import { renderFilters, readFilters } from './sections/filters.js';
import bindAssetsListing, { applyUiState } from './events.js';
import { getUiState } from './state.js';
import createSelection from './selection.js';
import createDetailController from './sections/detail/index.js';
import { sortAssets } from './shared/sort.js';

/**
 * Loads and decorates the assetslisting block.
 *
 * The block is a self-contained mini app: it owns the workspace chrome (actions
 * bar, options bar, filters panel) and a content region that reflects the DAM
 * folder addressed by the route, reacting to route changes without a reload.
 * @param {Element} block The assetslisting block element
 */
export default function decorate(block) {
  // In Universal Editor the route drives nothing; show a static placeholder and
  // don't mutate instrumented markup.
  if (isEditMode()) {
    block.replaceChildren(createState('Assets listing (vista dinámica en runtime)'));
    return;
  }

  let ui = getUiState();
  let currentPath = null;
  let currentCollectionId = null;
  let content = null;
  let detail = null;
  let currentAssets = [];
  let currentFolders = [];
  let currentTotal = null;
  let seq = 0;

  // Search state: the free-text term plus the active filter values (keyed by the
  // property each published filter declares). It lives here — not in the panel
  // DOM — so it survives the shell rebuild when the user navigates folders.
  let searchText = '';
  let activeFilters = {};
  let filterDefs = null;

  const isSearching = () => searchText.trim() !== '' || Object.keys(activeFilters).length > 0;

  const selection = createSelection(block, () => currentAssets, () => currentFolders);

  // The detail panel is fixed (out of flow) with a content-driven width, so
  // it can't reserve its own space in the grid's flow — this keeps
  // --ah-detail-actual-width (read by .assetslisting-content's padding-right
  // in layout.css) in sync with however wide the panel actually renders.
  const detailWidthObserver = new ResizeObserver(([entry]) => {
    block.style.setProperty('--ah-detail-actual-width', `${entry.contentRect.width}px`);
  });

  // Reflects the current asset selection onto the cards; a null path clears it.
  function markSelected(path) {
    content.querySelectorAll('.assetslisting-card-asset[data-selected]')
      .forEach((card) => { delete card.dataset.selected; });
    if (!path) return;
    const card = content.querySelector(
      `.assetslisting-card-asset[data-asset-path="${CSS.escape(path)}"]`,
    );
    if (card) card.dataset.selected = 'true';
  }

  // Re-sorts the already-fetched assets and re-renders — no refetch needed,
  // since sort is a pure client-side reorder of data already in memory.
  function renderSorted() {
    if (!content) return;
    renderContent(content, {
      folders: currentFolders,
      assets: sortAssets(currentAssets, ui.sortField, ui.sortDirection),
    }, isSearching() ? 'Sin resultados' : 'Esta carpeta está vacía');
    // Cards were rebuilt: reflect any live selection back onto them.
    if (selection.isActive()) selection.refresh();
    if (detail.isOpen()) markSelected(detail.getPath());
  }

  // Reflects the result count under the search box: total matches while
  // searching (the server pages/caps what it returns), plain count otherwise.
  function renderCount() {
    const count = block.querySelector('.assetslisting-count');
    if (!count) return;
    if (isSearching()) {
      const total = typeof currentTotal === 'number' ? currentTotal : currentAssets.length;
      count.textContent = `${total} resultados`;
    } else {
      count.textContent = `${currentAssets.length} assets`;
    }
  }

  function openAsset(path) {
    const asset = currentAssets.find((item) => item.path === path);
    if (!asset) return;
    detail.open(asset);
    block.dataset.detailOpen = 'true';
    markSelected(path);
  }

  // Enter selection mode (no-op if already active). Closes the detail panel
  // first so the two "picked asset" concepts (open detail vs multi-select)
  // never collide. Exposed separately from the toggle below so a checkbox
  // click can activate selection mode without risking exiting it again.
  function enterSelectionMode() {
    if (selection.isActive()) return;
    if (detail.isOpen()) {
      detail.close();
      block.dataset.detailOpen = 'false';
      markSelected(null);
    }
    selection.enter();
  }

  function toggleSelectionMode() {
    if (selection.isActive()) selection.exit();
    else enterSelectionMode();
  }

  // Best-effort bulk download: one download link per selected asset, mirroring
  // the detail panel's single-asset download.
  function downloadSelected() {
    const picked = new Set(selection.selectedPaths());
    currentAssets
      .filter((asset) => picked.has(asset.path))
      .forEach((asset) => {
        const link = document.createElement('a');
        link.href = asset.path;
        link.download = asset.name || displayLabel(asset);
        document.body.append(link);
        link.click();
        link.remove();
      });
  }

  // Share: generate an anonymous OOTB link on author (via the publish bridge)
  // for the selection — folders and/or assets — instead of firing N downloads.
  function shareSelected() {
    const paths = selection.selectedPaths();
    import('./sections/share/share.js').then(({ default: openShareModal }) => {
      openShareModal(block, currentPath || DAM_ROOT, paths);
    });
  }

  // The primary bulk action: one asset downloads; several elements — or any
  // folder — share. Mirrors the selection bar's label morph so button and
  // behaviour never disagree.
  function shareOrDownloadSelected() {
    if (selection.selectedPaths().length > 1 || selection.hasFolderSelected()) shareSelected();
    else downloadSelected();
  }

  // Fetches whatever the current context calls for: the plain folder/collection
  // listing, or — when the user typed a term or activated a filter — the
  // query-backed search over the current folder, collection or smart collection.
  // Search mode shows assets only (no folders), per the search spec.
  async function loadData() {
    const current = seq + 1;
    seq = current;
    const searching = isSearching();
    content.replaceChildren(createState(searching ? 'Buscando...' : 'Cargando assets...'));

    try {
      const search = { q: searchText.trim(), filters: activeFilters };
      const inCollectionRoot = currentCollectionId && !currentPath;
      let data;
      if (searching) {
        data = inCollectionRoot
          ? await fetchCollectionItems(currentCollectionId, search)
          : await searchAssets(currentPath || DAM_ROOT, search);
      } else {
        data = inCollectionRoot
          ? await fetchCollectionItems(currentCollectionId)
          : await fetchAssetsList(currentPath || DAM_ROOT);
      }
      if (current !== seq) return;
      currentAssets = data.assets || [];
      currentFolders = searching ? [] : (data.folders || []);
      currentTotal = searching && typeof data.total === 'number' ? data.total : null;
      renderSorted();
      renderCount();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      if (current !== seq) return;
      content.replaceChildren(createState(searching
        ? 'No se pudo ejecutar la búsqueda'
        : 'No se pudieron cargar los assets'));
    }
  }

  // Re-reads the active filters from the panel DOM and refreshes the listing.
  function onFiltersChanged() {
    const panel = block.querySelector('.assetslisting-filters-panel');
    if (panel) activeFilters = readFilters(panel);
    loadData();
  }

  function clearFilters() {
    activeFilters = {};
    const panel = block.querySelector('.assetslisting-filters-panel');
    if (panel && filterDefs) renderFilters(panel, filterDefs, activeFilters);
    loadData();
  }

  function setSearchText(value) {
    const next = value || '';
    if (next === searchText) return;
    searchText = next;
    loadData();
  }

  const controller = {
    getUi: () => ui,
    setUi: (next) => { ui = next; },
    openAsset,
    renderSorted,
    isSelectionMode: () => selection.isActive(),
    enterSelectionMode,
    toggleSelectionMode,
    toggleSelect: (path) => selection.toggle(path),
    clearSelection: () => selection.clear(),
    closeSelection: () => selection.exit(),
    downloadSelected: shareOrDownloadSelected,
    setSearchText,
    filtersChanged: onFiltersChanged,
    clearFilters,
  };

  // (Re)builds the whole shell for a path (and optional collection context), then
  // applies persisted UI state. The detail panel is rebuilt with the shell, so
  // navigating away closes it.
  function mountShell(path, collection) {
    const shell = renderShell(path, ui, collection);
    content = shell.content;
    detail = createDetailController({
      onClose: () => {
        block.dataset.detailOpen = 'false';
        markSelected(null);
      },
      // Lazy-load the add-to-collection modal: only needed on demand.
      onAddToCollection: (asset) => {
        import('./sections/collection/collection-add.js').then(({ default: openAddToCollectionModal }) => {
          openAddToCollectionModal(block, asset);
        });
      },
    });
    // The detail panel docks on the right: the grid keeps the left and the panel
    // takes a fixed track after it.
    shell.workspace.append(detail.root);
    detailWidthObserver.disconnect();
    detailWidthObserver.observe(detail.root);
    block.replaceChildren(shell.fragment);
    block.dataset.detailOpen = 'false';
    applyUiState(block, ui);
    // A rebuilt shell means a new folder/collection: selection never carries across.
    selection.reset();
    // The search state survives navigation, so re-apply it to the fresh chrome:
    // the search box keeps its term and the panel re-renders the active filters.
    const searchInput = block.querySelector('.assetslisting-search-input');
    if (searchInput) searchInput.value = searchText;
    if (filterDefs) renderFilters(shell.filtersPanel, filterDefs, activeFilters);
    currentPath = path;
    currentCollectionId = collection ? collection.id : null;
  }

  async function update(route) {
    // A `collection` filter turns the listing into a collection view: the same
    // grid, but the data comes from the collection (at its root) and the
    // breadcrumb is rooted at the collection. A path alongside it means the user
    // stepped into a member folder, listed as a normal DAM folder.
    const collection = route.filters.collection
      ? { id: route.filters.collection, label: route.filters.collabel || 'Colección' }
      : null;
    const path = route.path || (collection ? '' : DAM_ROOT);
    const collectionId = collection ? collection.id : null;

    if (path !== currentPath || collectionId !== currentCollectionId) {
      mountShell(path, collection);
    }

    await loadData();
  }

  bindAssetsListing(block, controller);
  update(getRoute());

  // The filter definitions are published config: fetch them once per block life
  // and render the panel (re-rendered with the active values on every mount).
  fetchSearchFilters().then((data) => {
    filterDefs = data.filters || [];
    const panel = block.querySelector('.assetslisting-filters-panel');
    if (panel) renderFilters(panel, filterDefs, activeFilters);
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
  });

  const unsubscribe = subscribeRoute((route) => {
    if (!block.isConnected) {
      unsubscribe();
      return;
    }
    if (route.view === ASSETS_LISTING_VIEW) update(route);
  });
}
