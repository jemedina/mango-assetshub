/*
 * Content region: the folder/asset grid, plus the shared state message node
 * (loading / empty / error) rendered into the same region.
 */

import { createFolderCard, createAssetCard } from './cards.js';

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
 * Renders the folder/asset grid (or the empty state) into the content region.
 * @param {Element} content The `.assetslisting-content` element
 * @param {{ folders?: Array, assets?: Array }} data
 */
export function renderContent(content, data) {
  const folders = data.folders || [];
  const assets = data.assets || [];

  if (!folders.length && !assets.length) {
    content.replaceChildren(createState('Esta carpeta está vacía'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'assetslisting-grid';
  folders.forEach((folder) => grid.append(createFolderCard(folder)));
  assets.forEach((asset) => grid.append(createAssetCard(asset)));

  content.replaceChildren(grid);
}
