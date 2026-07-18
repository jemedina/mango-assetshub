/*
 * Card builders for the content grid: folder cards (navigate on click) and
 * asset cards (preview + format badge + a three-row info section).
 *
 * List view reflows the exact same asset-card markup into a table row (see
 * cards.css): thumb, body, category, size and modified are all direct
 * children of the card, mapped 1:1 onto CSS Grid columns — no wrapper
 * elements needed, so there's nothing that can get auto-placed oddly.
 */

import {
  displayLabel, formatLabel, formatSizeMb, formatDate,
} from '../data.js';
import createPreview, { createBadge } from '../shared/preview.js';
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

const NO_VALUE = '—';

/**
 * The card's info section: a name row (name + format badge — the badge only
 * shows here in list view; in grid view it stays overlaid on the thumbnail),
 * then size (left) and date (right) — grid view only, list view shows these
 * in their own dedicated columns instead — then keyword chips.
 */
function createInfo(asset) {
  const body = document.createElement('figcaption');
  body.className = 'assetslisting-body';

  const nameRow = document.createElement('span');
  nameRow.className = 'assetslisting-name-row';

  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(asset);
  nameRow.append(name);

  const format = formatLabel(asset.format);
  if (format) {
    const badge = createBadge(format);
    badge.classList.add('assetslisting-name-badge');
    nameRow.append(badge);
  }

  const facts = document.createElement('span');
  facts.className = 'assetslisting-facts';
  facts.append(
    fact('assetslisting-size', formatSizeMb(asset.size)),
    fact('assetslisting-date', formatDate(asset.uploaded)),
  );

  body.append(nameRow, facts);

  const keywords = createKeywords(asset.tags, asset.smartTags);
  if (keywords) body.append(keywords);

  return body;
}

/**
 * List-view-only column cells: category (Subcarpetas) and size/date, each a
 * standalone element — siblings of thumb/body, not nested inside them, so
 * they map straight onto their own CSS Grid column.
 *
 * The listing endpoint has no dedicated "subcarpeta" field yet, so category
 * borrows the asset's first DAM keyword tag as a best-effort stand-in — real
 * data, just not guaranteed to mean the same thing a dedicated field
 * eventually would.
 * @param {Object} asset
 * @returns {HTMLElement[]}
 */
function createListColumns(asset) {
  const category = fact('assetslisting-category', asset.tags?.[0] || NO_VALUE);
  const size = fact('assetslisting-size-cell', formatSizeMb(asset.size) || NO_VALUE);
  const modified = fact('assetslisting-modified-cell', formatDate(asset.uploaded) || NO_VALUE);
  return [category, size, modified];
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

  card.append(
    check,
    createPreview(asset, { badge: true }),
    createInfo(asset),
    ...createListColumns(asset),
  );
  return card;
}
