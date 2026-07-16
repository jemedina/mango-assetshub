import { getRoute, subscribeRoute } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import { fetchAssetsList, DAM_ROOT } from './data.js';
import { renderShell, renderContent, createState } from './sections/index.js';
import bindAssetsListing, { applyUiState, ASSETS_LISTING_VIEW } from './events.js';
import { getUiState } from './state.js';
import createDetailController from './sections/detail/index.js';

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
  let seq = 0;

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

  function openAsset(path) {
    const asset = currentAssets.find((item) => item.path === path);
    if (!asset) return;
    detail.open(asset);
    block.dataset.detailOpen = 'true';
    markSelected(path);
  }

  const controller = {
    getUi: () => ui,
    setUi: (next) => { ui = next; },
    openAsset,
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
      renderContent(content, data);
      if (detail.isOpen()) markSelected(detail.getPath());
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
