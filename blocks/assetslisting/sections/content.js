/*
 * Content region: the folder/asset grid, plus the shared state message node
 * (loading / empty / error) rendered into the same region.
 */

import { createFolderCard, createAssetCard } from './cards.js';
import { ICON_INBOX } from '../shared/icons.js';

/**
 * Builds a single-line state message (loading, error).
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
 * Builds the empty-folder state: an inbox icon, title, subtitle and a button
 * back to "Todos los assets" (Figma: empty-state mock).
 * @returns {HTMLElement}
 */
function createEmptyState() {
  const state = document.createElement('div');
  state.className = 'assetslisting-empty';

  const icon = document.createElement('span');
  icon.className = 'assetslisting-empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_INBOX;

  const title = document.createElement('p');
  title.className = 'assetslisting-empty-title';
  title.textContent = 'Carpeta vacía';

  const subtitle = document.createElement('p');
  subtitle.className = 'assetslisting-empty-subtitle';
  subtitle.textContent = 'No hay assets en esta ubicación.';

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'btn btn-primary assetslisting-empty-action';
  action.dataset.action = 'view-all';
  action.textContent = 'Ver todos los assets';

  state.append(icon, title, subtitle, action);
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
 * "SUBCARPETAS — 3" / "ARCHIVOS — 3" — the small caption above each grid-view
 * section (Figma: grid-view empty/section mock).
 * @param {string} label
 * @param {number} count
 * @returns {HTMLElement}
 */
function createSectionLabel(label, count) {
  const el = document.createElement('p');
  el.className = 'assetslisting-section-label';
  el.textContent = `${label} — ${count}`;
  return el;
}

function createGrid(items, build) {
  const grid = document.createElement('div');
  grid.className = 'assetslisting-grid';
  items.forEach((item) => grid.append(build(item)));
  return grid;
}

/**
 * Renders the folder/asset grid (or the empty state) into the content region.
 *
 * List view is one continuous table: folders and assets share a single grid
 * (rows tell them apart via the "CARPETA" badge), under one column header.
 * Grid view instead splits them into two labeled sections — "Subcarpetas"
 * then "Archivos" — each its own card grid, per the Figma mock.
 * @param {Element} content The `.assetslisting-content` element
 * @param {{ folders?: Array, assets?: Array }} data
 * @param {'grid'|'list'} viewMode
 * @param {string} [emptyMessage] plain state shown when there is nothing to
 *   render (search mode says "no results"); omitted while browsing, which
 *   shows the rich empty-folder state instead
 */
export function renderContent(content, data, viewMode, emptyMessage) {
  const folders = data.folders || [];
  const assets = data.assets || [];

  if (!folders.length && !assets.length) {
    content.replaceChildren(emptyMessage ? createState(emptyMessage) : createEmptyState());
    return;
  }

  if (viewMode === 'list') {
    const grid = createGrid(folders, createFolderCard);
    assets.forEach((asset) => grid.append(createAssetCard(asset)));
    content.replaceChildren(createListHeader(), grid);
    return;
  }

  // The Subcarpetas/Archivos split only means something when both kinds are
  // actually present — a folder with just one or the other shows a single
  // plain grid instead, with no label to distinguish from.
  const showLabels = folders.length > 0 && assets.length > 0;

  const sections = document.createDocumentFragment();
  if (folders.length) {
    if (showLabels) sections.append(createSectionLabel('Subcarpetas', folders.length));
    sections.append(createGrid(folders, createFolderCard));
  }
  if (assets.length) {
    if (showLabels) sections.append(createSectionLabel('Archivos', assets.length));
    sections.append(createGrid(assets, createAssetCard));
  }
  content.replaceChildren(sections);
}
