/*
 * Card builders for the content grid: folder cards (navigate on click) and
 * asset cards (preview + format badge + a three-row info section).
 */

import {
  displayLabel, formatSizeMb, formatDate,
} from '../data.js';
import createPreview from '../shared/preview.js';
import createKeywords from '../shared/keywords.js';

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

  // Same decorative selection checkbox as asset cards: folders are selectable
  // too (a folder selection shares the whole folder), keyed off `data-checked`.
  const check = document.createElement('span');
  check.className = 'assetslisting-check';
  check.setAttribute('aria-hidden', 'true');
  card.append(check);

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

function fact(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/**
 * The card's three-row info section: title, then size (left) and date (right),
 * then keyword chips.
 */
function createInfo(asset) {
  const body = document.createElement('figcaption');
  body.className = 'assetslisting-body';

  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(asset);

  const facts = document.createElement('span');
  facts.className = 'assetslisting-facts';
  facts.append(
    fact('assetslisting-size', formatSizeMb(asset.size)),
    fact('assetslisting-date', formatDate(asset.uploaded)),
  );

  body.append(name, facts);

  const keywords = createKeywords(asset.tags, asset.smartTags);
  if (keywords) body.append(keywords);

  return body;
}

/**
 * Builds an asset card: a preview region (image or file icon) with a format
 * badge, above an info region (name, size + date, keywords). Clicking opens the
 * asset, or toggles its selection while selection mode is active; both are wired
 * by the delegated handler in events.js off `data-asset-path`. The corner
 * checkbox is decorative — hidden until selection mode, driven by the card's
 * `data-checked` flag — so it ships with every card and needs no rebind.
 * @param {Object} asset asset summary from the listing endpoint
 * @returns {HTMLElement}
 */
export function createAssetCard(asset) {
  const card = document.createElement('figure');
  card.className = 'assetslisting-card assetslisting-card-asset';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  if (asset.path) card.dataset.assetPath = asset.path;

  const check = document.createElement('span');
  check.className = 'assetslisting-check';
  check.setAttribute('aria-hidden', 'true');

  card.append(check, createPreview(asset, { badge: true }), createInfo(asset));
  return card;
}
