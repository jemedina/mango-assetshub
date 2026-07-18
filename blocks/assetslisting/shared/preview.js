/*
 * Shared asset-preview builder. A preview is either an inline image (for raster
 * formats) or a file-type icon plus its extension (for everything else). Reused
 * by the card grid and the detail panel so both stay visually consistent.
 */

import {
  displayLabel, formatLabel, isPreviewable, assetIconUrl,
} from '../data.js';

function renderImage(thumb, src, alt) {
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = alt;
  img.src = src;
  img.addEventListener('error', () => thumb.classList.add('is-empty'));
  thumb.append(img);
}

function renderIcon(thumb, format) {
  const icon = document.createElement('img');
  icon.className = 'assetslisting-thumb-icon';
  icon.src = assetIconUrl(format);
  icon.alt = '';
  icon.loading = 'lazy';
  // Missing per-format icon: drop the <img> and let the CSS glyph stand in.
  icon.addEventListener('error', () => {
    icon.remove();
    thumb.classList.add('is-generic');
  });

  const ext = document.createElement('span');
  ext.className = 'assetslisting-thumb-ext';
  ext.textContent = `.${format}`;

  thumb.classList.add('assetslisting-thumb-file');
  thumb.append(icon, ext);
}

/**
 * Builds the uppercase format badge chip (colored per format via CSS, keyed
 * off `data-format`). Exported so list view can render its own soft-tinted
 * variant next to the name instead of the solid one overlaid on the thumb.
 * @param {string} format short format label (see formatLabel)
 * @returns {HTMLElement}
 */
export function createBadge(format) {
  const badge = document.createElement('span');
  badge.className = 'assetslisting-format-badge';
  badge.dataset.format = format;
  badge.textContent = format;
  return badge;
}

/**
 * Builds the preview region for an asset.
 * @param {{ path?: string, format?: string, title?: string, name?: string }} asset
 * @param {{ badge?: boolean, variant?: string }} [options]
 *   badge   render the uppercase format badge in the top-right corner
 *   variant extra modifier appended to the base class (e.g. 'detail')
 * @returns {HTMLElement} the `.assetslisting-thumb` element
 */
export default function createPreview(asset, options = {}) {
  const { badge = false, variant } = options;
  const format = formatLabel(asset.format);

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb';
  if (variant) thumb.classList.add(`assetslisting-thumb-${variant}`);

  if (isPreviewable(format) && asset.path) {
    renderImage(thumb, asset.path, displayLabel(asset));
  } else if (format) {
    renderIcon(thumb, format);
  } else {
    thumb.classList.add('is-empty');
  }

  if (badge && format) {
    thumb.append(createBadge(format));
  }

  return thumb;
}
