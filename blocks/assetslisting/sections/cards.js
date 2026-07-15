/*
 * Card builders for the content grid: folder cards (navigate on click) and
 * asset cards (thumbnail + format badge + metadata).
 */

import { displayLabel, formatLabel } from '../data.js';

// Formats with no raster preview: show the format's file icon + extension
// instead of attempting an <img> render.
const ICON_ONLY_FORMATS = new Map([
  ['pdf', 'file-pdf.svg'],
  ['svg', 'file-svg.svg'],
  ['wav', 'file-wav.svg'],
]);

/**
 * Builds a folder card. The click target is the whole button; navigation is
 * wired via the delegated handler in events.js off `data-href`.
 * @param {{ path: string }} folder
 * @returns {HTMLButtonElement}
 */
export function createFolderCard(folder) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'assetslisting-card assetslisting-card-folder';
  card.dataset.href = folder.path;

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb assetslisting-thumb-folder';
  thumb.setAttribute('aria-hidden', 'true');

  const body = document.createElement('span');
  body.className = 'assetslisting-body';

  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(folder);
  body.append(name);

  card.append(thumb, body);
  return card;
}

/**
 * Builds an asset card.
 * @param {{ path?: string, format?: string }} asset
 * @returns {HTMLElement}
 */
export function createAssetCard(asset) {
  const card = document.createElement('figure');
  card.className = 'assetslisting-card assetslisting-card-asset';
  const label = displayLabel(asset);

  const format = formatLabel(asset.format);

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb';
  if (format && ICON_ONLY_FORMATS.has(format)) {
    const icon = document.createElement('img');
    icon.className = 'assetslisting-thumb-icon';
    icon.src = `${window.hlx.codeBasePath}/icons/${ICON_ONLY_FORMATS.get(format)}`;
    icon.alt = '';
    icon.loading = 'lazy';
    const ext = document.createElement('span');
    ext.className = 'assetslisting-thumb-ext';
    ext.textContent = `.${format}`;
    thumb.append(icon, ext);
  } else if (asset.path) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = label;
    img.src = asset.path;
    img.addEventListener('error', () => thumb.classList.add('is-empty'));
    thumb.append(img);
  } else {
    thumb.classList.add('is-empty');
  }

  if (format) {
    const badge = document.createElement('span');
    badge.className = 'assetslisting-format-badge';
    badge.dataset.format = format;
    badge.textContent = format;
    thumb.append(badge);
  }

  const body = document.createElement('span');
  body.className = 'assetslisting-body';

  const name = document.createElement('figcaption');
  name.className = 'assetslisting-name';
  name.textContent = label;
  body.append(name);

  if (asset.format) {
    const meta = document.createElement('span');
    meta.className = 'assetslisting-meta';
    meta.textContent = asset.format;
    body.append(meta);
  }

  card.append(thumb, body);

  return card;
}
