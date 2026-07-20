/*
 * Detail-panel controller. Owns the panel element and its lifecycle: opening an
 * asset renders the header preview from the summary immediately, then fetches
 * the full detail and builds the tab bodies. Panel-internal interactions (tab
 * switching, close, download, share) are handled here via one delegated listener
 * so the block only has to say `open(asset)` / `close()`.
 */

import { fetchAssetDetail, displayLabel } from '../../data.js';
import createPreview from '../../shared/preview.js';
import createDetailPanel from './panel.js';
import TABS from './tabs.js';

const DEFAULT_TAB = 'info';

function stateMessage(message) {
  const state = document.createElement('p');
  state.className = 'assetslisting-detail-empty';
  state.textContent = message;
  return state;
}

/**
 * Creates a detail-panel controller.
 * @param {{ onClose?: () => void, onAddToCollection?: (asset: Object) => void }} [options]
 *   onClose fires when the user dismisses the panel from within (the close
 *   button), so the host can clear its selection state; onAddToCollection fires
 *   with the open asset when the "Añadir a colección" action is used.
 * @returns {{
 *   root: HTMLElement, open: (asset: Object) => void, close: () => void,
 *   isOpen: () => boolean, getPath: () => (string|null)
 * }}
 */
export default function createDetailController(options = {}) {
  const panel = createDetailPanel();
  const { root, image, body } = panel;

  let currentPath = null;
  let currentAsset = null;
  let activeTab = DEFAULT_TAB;
  let seq = 0;

  function selectTab(id) {
    activeTab = id;
    panel.tabButtons.forEach((button, tabId) => {
      button.setAttribute('aria-selected', String(tabId === id));
    });
    body.querySelectorAll('.assetslisting-detail-panel').forEach((section) => {
      section.hidden = section.dataset.tab !== id;
    });
  }

  function renderTabs(detail) {
    const panels = document.createDocumentFragment();
    TABS.forEach((tab) => {
      const section = document.createElement('div');
      section.className = 'assetslisting-detail-panel';
      section.dataset.tab = tab.id;
      section.setAttribute('role', 'tabpanel');
      const content = tab.build(detail);
      if (content) section.append(content);
      panels.append(section);
    });
    body.replaceChildren(panels);
    selectTab(activeTab);
  }

  function open(asset) {
    currentPath = asset.path;
    currentAsset = asset;
    activeTab = DEFAULT_TAB;
    root.hidden = false;

    image.replaceChildren(createPreview(asset, { variant: 'detail' }));
    body.replaceChildren(stateMessage('Cargando detalles...'));

    const request = seq + 1;
    seq = request;

    fetchAssetDetail(asset.path)
      .then((detail) => {
        if (request !== seq) return;
        currentAsset = detail;
        renderTabs(detail);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        if (request !== seq) return;
        body.replaceChildren(stateMessage('No se pudo cargar el detalle'));
      });
  }

  function close() {
    seq += 1;
    currentPath = null;
    currentAsset = null;
    root.hidden = true;
    image.replaceChildren();
    body.replaceChildren();
  }

  function flashShare(message) {
    const button = root.querySelector('.assetslisting-detail-share');
    if (!button) return;
    const original = button.textContent;
    button.textContent = message;
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1500);
  }

  function download() {
    if (!currentAsset || !currentAsset.path) return;
    const link = document.createElement('a');
    link.href = currentAsset.path;
    link.download = currentAsset.name || displayLabel(currentAsset);
    document.body.append(link);
    link.click();
    link.remove();
  }

  function share() {
    if (!currentAsset || !currentAsset.path) return;
    const url = new URL(currentAsset.path, window.location).href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => flashShare('¡Copiado!'));
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'detail-close':
        close();
        if (options.onClose) options.onClose();
        break;
      case 'detail-download':
        download();
        break;
      case 'detail-share':
        share();
        break;
      case 'detail-add-to-collection':
        if (currentAsset && currentAsset.path && options.onAddToCollection) {
          options.onAddToCollection(currentAsset);
        }
        break;
      default:
        // 'detail-edit' is intentionally a no-op for now.
        break;
    }
  }

  function onClick(event) {
    const tab = event.target.closest('[data-tab]');
    if (tab && panel.tabButtons.has(tab.dataset.tab)) {
      selectTab(tab.dataset.tab);
      return;
    }

    const action = event.target.closest('[data-action]');
    if (action) handleAction(action.dataset.action);
  }

  root.hidden = true;
  root.addEventListener('click', onClick);

  return {
    root,
    open,
    close,
    isOpen: () => currentPath !== null,
    getPath: () => currentPath,
  };
}
