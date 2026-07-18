import { getRoute, subscribeRoute } from '../../scripts/router.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import { fetchAssetsList, displayLabel, DAM_ROOT } from './data.js';
import { renderShell, renderContent, createState } from './sections/index.js';
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
  let content = null;
  let detail = null;
  let currentAssets = [];
  let currentFolders = [];
  let seq = 0;

  const selection = createSelection(block, () => currentAssets);

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
    }, ui.viewMode);
    // Cards were rebuilt: reflect any live selection back onto them.
    if (selection.isActive()) selection.refresh();
    if (detail.isOpen()) markSelected(detail.getPath());
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

  // Multi-asset share: generate an anonymous OOTB link for the selection instead
  // of firing N downloads. The current folder is the share anchor (selection is
  // folder-scoped, so it is always the selection's common parent).
  function shareSelected() {
    const paths = selection.selectedPaths();
    import('./sections/share/share.js').then(({ default: openShareModal }) => {
      openShareModal(block, currentPath || DAM_ROOT, paths);
    });
  }

  // The primary bulk action: one asset downloads, several share. Mirrors the
  // selection bar's label morph so button and behaviour never disagree.
  function shareOrDownloadSelected() {
    if (selection.selectedPaths().length > 1) shareSelected();
    else downloadSelected();
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
  };

  // (Re)builds the whole shell for a path, then applies persisted UI state. The
  // detail panel is rebuilt with the shell, so navigating away closes it.
  function mountShell(path) {
    const shell = renderShell(path, ui);
    content = shell.content;
    detail = createDetailController({
      onClose: () => {
        block.dataset.detailOpen = 'false';
        markSelected(null);
      },
    });
    // The detail panel docks on the right: the grid keeps the left and the panel
    // takes a fixed track after it.
    shell.workspace.append(detail.root);
    block.replaceChildren(shell.fragment);
    block.dataset.detailOpen = 'false';
    applyUiState(block, ui);
    // A rebuilt shell means a new folder: selection never carries across folders.
    selection.reset();
    currentPath = path;
  }

  async function update(route) {
    const path = route.path || DAM_ROOT;
    if (path !== currentPath) mountShell(path);

    const current = seq + 1;
    seq = current;
    content.replaceChildren(createState('Cargando assets...'));

    try {
      const data = await fetchAssetsList(path);
      if (current !== seq) return;
      currentAssets = data.assets || [];
      currentFolders = data.folders || [];
      renderSorted();
      const count = block.querySelector('.assetslisting-count');
      if (count) count.textContent = `${currentAssets.length} assets`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      if (current !== seq) return;
      content.replaceChildren(createState('No se pudieron cargar los assets'));
    }
  }

  bindAssetsListing(block, controller);
  update(getRoute());

  const unsubscribe = subscribeRoute((route) => {
    if (!block.isConnected) {
      unsubscribe();
      return;
    }
    if (route.view === ASSETS_LISTING_VIEW) update(route);
  });
}
