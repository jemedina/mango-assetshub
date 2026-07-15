import { getRoute, subscribeRoute } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import { fetchAssetsList, DAM_ROOT } from './data.js';
import { renderShell, renderContent, createState } from './render.js';
import bindAssetsListing, { applyUiState, ASSETS_LISTING_VIEW } from './events.js';
import { getUiState } from './state.js';

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
  const controller = {
    getUi: () => ui,
    setUi: (next) => { ui = next; },
  };

  let currentPath = null;
  let content = null;
  let seq = 0;

  // (Re)builds the whole shell for a path, then applies persisted UI state.
  function mountShell(path) {
    const shell = renderShell(path, ui);
    content = shell.content;
    block.replaceChildren(shell.fragment);
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
      renderContent(content, data);
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
