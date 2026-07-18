/*
 * Content region: the folder/asset grid, plus the shared state message node
 * (loading / empty / error) rendered into the same region.
 */

import { createAssetCard } from './cards.js';

/**
 * Builds a single-line state message (loading, empty, error).
 * @param {string} message
 * @returns {HTMLParagraphElement}
 */
export function createState(message) {
  const state = document.createElement('p');
  state.className = 'assetslisting-state';
  state.textContent = message;
  return state;
}

/**
 * Column header row for list view — hidden in grid view via CSS. Shares its
 * grid-template-columns with each asset row (see cards.css) so headers and
 * cells line up.
 * @returns {HTMLElement}
 */
function createListHeader() {
  const header = document.createElement('div');
  header.className = 'assetslisting-list-header';
  header.setAttribute('aria-hidden', 'true');
  header.innerHTML = `
    <span class="assetslisting-list-header-cell"></span>
    <span class="assetslisting-list-header-cell"></span>
    <span class="assetslisting-list-header-cell">Nombre</span>
    <span class="assetslisting-list-header-cell">Subcarpetas</span>
    <span class="assetslisting-list-header-cell assetslisting-list-header-cell-end">Tamaño</span>
    <span class="assetslisting-list-header-cell assetslisting-list-header-cell-end">Modificado</span>
  `;
  return header;
}

/**
 * Renders the asset grid (or the empty state) into the content region.
 * Folders are never mixed in here — they're navigated from the sidebar folder
 * tree instead, in both grid and list view.
 * @param {Element} content The `.assetslisting-content` element
 * @param {{ assets?: Array }} data
 */
export function renderContent(content, data) {
  const assets = data.assets || [];

  if (!assets.length) {
    content.replaceChildren(createState('Esta carpeta está vacía'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'assetslisting-grid';
  assets.forEach((asset) => grid.append(createAssetCard(asset)));

  content.replaceChildren(createListHeader(), grid);
}
