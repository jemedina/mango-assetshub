/*
 * Card builder for the content grid: asset cards (preview + format badge + a
 * three-row info section) and folder cards (folder icon + name, navigated via
 * the delegated handler in events.js off `data-href`). Both are listed here so
 * a folder's contents — assets of any format — stay reachable by drilling in.
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
import { ICON_FOLDER, ICON_FOLDER_THUMB } from '../shared/icons.js';

function fact(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

const NO_VALUE = '—';

/** "0 assets", "1 asset", "2 assets"... */
function assetCountLabel(count) {
  return count === 1 ? '1 asset' : `${count} assets`;
}

/**
 * Builds a folder card: a gray folder glyph over the thumbnail, then a name
 * row and a count/date facts row below it (Figma: node 1:4328, "FolderCard").
 *
 * Grid and list view diverge here (unlike the asset card, which reuses one
 * markup for both): grid shows a small folder icon next to the name and the
 * facts row inline in the body; list view instead shows a "CARPETA" badge
 * next to the name (reusing the same format-badge look/class asset rows use)
 * and moves count/date into their own list-column cells so folder rows line
 * up with asset rows. Both variants ship in the DOM always — CSS toggles
 * which shows per `data-view-mode`, same pattern as the asset card's name
 * badge — so there's no view-mode branching here.
 *
 * `assetCount` is the folder's own direct count (annotated by
 * `withFolderAssetCounts` in data.js — the listing endpoint doesn't return it
 * itself), always a real number (0, not a placeholder, for a folder that only
 * holds sub-folders). `modified` has no such backfill yet, so it still falls
 * back to `NO_VALUE`. There's no "subcarpetas" equivalent for a folder, so
 * that list column is always `NO_VALUE`.
 * @param {{ path: string, assetCount?: number, modified?: string }} folder
 * @returns {HTMLButtonElement}
 */
export function createFolderCard(folder) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'assetslisting-card assetslisting-card-folder';
  card.dataset.href = folder.path;

  // Same decorative selection checkbox slot as asset cards, but folders never
  // show a checkbox in list view (see cards.css) — kept in the DOM anyway so
  // the row's column count/alignment doesn't shift.
  const check = document.createElement('span');
  check.className = 'assetslisting-check';
  check.setAttribute('aria-hidden', 'true');
  card.append(check);

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb assetslisting-thumb-folder';
  thumb.setAttribute('aria-hidden', 'true');
  thumb.innerHTML = ICON_FOLDER_THUMB;

  const body = document.createElement('span');
  body.className = 'assetslisting-body';

  const nameRow = document.createElement('span');
  nameRow.className = 'assetslisting-name-row';
  const nameIcon = document.createElement('span');
  nameIcon.className = 'assetslisting-folder-name-icon';
  nameIcon.setAttribute('aria-hidden', 'true');
  nameIcon.innerHTML = ICON_FOLDER;
  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(folder);
  const badge = createBadge('carpeta');
  badge.classList.add('assetslisting-name-badge');
  nameRow.append(nameIcon, name, badge);

  const assetCount = folder.assetCount ?? 0;
  const facts = document.createElement('span');
  facts.className = 'assetslisting-facts';
  facts.append(
    fact('assetslisting-size', assetCountLabel(assetCount)),
    fact('assetslisting-date', formatDate(folder.modified) || NO_VALUE),
  );

  body.append(nameRow, facts);

  const category = fact('assetslisting-category', NO_VALUE);
  const sizeCell = fact('assetslisting-size-cell', assetCountLabel(assetCount));
  const modifiedCell = fact('assetslisting-modified-cell', formatDate(folder.modified) || NO_VALUE);

  card.append(thumb, body, category, sizeCell, modifiedCell);
  return card;
}

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
    fact('assetslisting-size', formatSizeMb(asset.size) || NO_VALUE),
    fact('assetslisting-date', formatDate(asset.uploaded) || NO_VALUE),
  );

  body.append(nameRow, facts);

  // The cap only bites in grid view (CSS shows everything unclipped in list
  // view instead) — see the `assetslisting-keyword-overflow` rules in cards.css.
  const keywords = createKeywords(asset.tags, asset.smartTags, { limit: 3 });
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
  const modified = fact('assetslisting-modified-cell', formatDate(asset.modified) || NO_VALUE);
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
