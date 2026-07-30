import { getRoute, subscribeRoute } from '../../scripts/router.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import {
  fetchAssetsList, fetchCollectionItems, withFolderAssetCounts, displayLabel, DAM_ROOT,
} from './data.js';
import { fetchSearchFilters, searchAssets } from '../../scripts/assets-api.js';
import { renderShell, renderContent, createState, createLoadMoreButton } from './sections/index.js';
import { renderFilters, readFilters } from './sections/filters.js';
import bindAssetsListing, { applyUiState } from './events.js';
import { getUiState } from './state.js';
import createSelection from './selection.js';
import createDetailController from './sections/detail/index.js';
import { sortAssets } from './shared/sort.js';

// "Todos los assets" and search/filter results both page the search
// endpoint's default batch size — see AssetSearchServlet's own clampLimit
// default, kept in step so a request never asks for more than the servlet
// would give anyway.
const ASSETS_PAGE_SIZE = 100;

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
  let assetsOffset = 0;
  let hasMoreAssets = false;
  let loadingMoreAssets = false;
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
    }, ui.viewMode, isSearching() ? 'Sin resultados' : null);
    // "Todos los assets" pages manually — appended after the grid rather than
    // built into renderContent, which stays agnostic of paging.
    if (hasMoreAssets) content.append(createLoadMoreButton());
    // Cards were rebuilt: reflect any live selection back onto them.
    if (selection.isActive()) selection.refresh();
    if (detail.isOpen()) markSelected(detail.getPath());
  }

  // Reflects the result count under the search box: the server's total when
  // it's trustworthy (collection search only — see loadData), otherwise the
  // count of what's loaded so far, which grows as more pages come in via
  // "Mostrar más".
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
  // Search mode shows assets only (no folders), per the search spec. Browsing
  // the DAM root with nothing searched instead pages through every asset in
  // the DAM via that same search endpoint (empty query = match everything
  // under the path) rather than a plain one-level folder listing.
  //
  // Both of those (plain "Todos los assets" and an active search/filter) page
  // through AssetSearchServlet the same way — the only case excluded is a
  // collection, whose own bridge endpoint has its own documented 100-member
  // cap and no offset support, so it isn't paginated here.
  // @param {{ append?: boolean }} [options] append fetches the next page onto
  //   what's already rendered instead of replacing it with a loading state.
  async function loadData({ append = false } = {}) {
    const current = seq + 1;
    seq = current;
    const searching = isSearching();
    const inCollectionRoot = currentCollectionId && !currentPath;
    const isAllAssetsRoot = !inCollectionRoot && !searching && currentPath === DAM_ROOT;
    const paginated = !inCollectionRoot && (searching || isAllAssetsRoot);

    if (!append) {
      content.replaceChildren(createState(searching ? 'Buscando...' : 'Cargando assets...'));
      assetsOffset = 0;
    }

    try {
      let data;
      if (inCollectionRoot) {
        data = searching
          ? await fetchCollectionItems(currentCollectionId, {
            q: searchText.trim(), filters: activeFilters,
          })
          : await fetchCollectionItems(currentCollectionId);
      } else if (paginated) {
        data = await searchAssets(currentPath || DAM_ROOT, {
          q: searchText.trim(),
          filters: activeFilters,
          limit: ASSETS_PAGE_SIZE,
          offset: assetsOffset,
        });
      } else {
        data = await fetchAssetsList(currentPath || DAM_ROOT);
      }
      if (current !== seq) return;

      const newAssets = data.assets || [];
      currentAssets = append ? currentAssets.concat(newAssets) : newAssets;
      assetsOffset += newAssets.length;
      // One extra request per visible folder (its own direct asset count) —
      // small in practice (a handful of sub-folders per level) and worth the
      // wait so a folder full of folders shows "0 assets" instead of "—".
      currentFolders = (searching || isAllAssetsRoot)
        ? [] : await withFolderAssetCounts(data.folders || []);
      if (current !== seq) return;
      // Only the collection bridge's `total` is trusted — AssetSearchServlet's
      // p.guessTotal has been observed echoing back the page size instead of
      // the real match count for both the plain "Todos los assets" query and
      // an active search, which would make currentAssets.length < currentTotal
      // always false. A full page (exactly what was asked for) is used as the
      // "there's probably more" signal for both instead — a short last page
      // means there's nothing left to fetch.
      currentTotal = inCollectionRoot && searching && typeof data.total === 'number'
        ? data.total : null;
      hasMoreAssets = paginated && newAssets.length === ASSETS_PAGE_SIZE;
      renderSorted();
      renderCount();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      if (current !== seq) return;
      // An append failure leaves the already-rendered page as-is (nothing to
      // replace) — events.js re-enables the button itself so the user can
      // retry, since no re-render happens here to refresh it.
      if (!append) {
        content.replaceChildren(createState(searching
          ? 'No se pudo ejecutar la búsqueda'
          : 'No se pudieron cargar los assets'));
      }
    }
  }

  // "Mostrar más" (see events.js): loads the next page — of "Todos los
  // assets" or of the current search/filter results — and appends it to
  // what's already rendered.
  async function loadMoreAssets() {
    if (!hasMoreAssets || loadingMoreAssets) return;
    loadingMoreAssets = true;
    try {
      await loadData({ append: true });
    } finally {
      loadingMoreAssets = false;
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
    loadMoreAssets,
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
