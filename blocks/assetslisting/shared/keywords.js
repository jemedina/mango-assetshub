/*
 * Shared keyword-chip builder. Renders an asset's tags and smart (machine-
 * generated) tags as a chip list; smart tags carry a modifier so they read
 * distinctly. Reused by the card info row and the detail panel's Keywords tab.
 */

function createChip(label, smart) {
  const chip = document.createElement('li');
  chip.className = 'assetslisting-keyword';
  if (smart) chip.classList.add('assetslisting-keyword-smart');
  chip.textContent = label;
  return chip;
}

/**
 * Builds a keyword chip list. When `limit` is set and there are more tags
 * than that, an extra "+1" chip (same style, no icon) is appended — it's a
 * fixed "more exist" marker, not a count of how many, whether there's 1 extra
 * or 10. The real chips past the limit are still rendered (not sliced off),
 * so CSS alone can decide per view whether to honor the cap (grid) or show
 * everything unclipped (list).
 * @param {string[]} [tags] authored tag labels
 * @param {string[]} [smartTags] machine-generated tag labels
 * @param {{ empty?: string, limit?: number }} [options] empty-state text
 *   (omit to render nothing) and/or the grid-view visible-chip cap
 * @returns {HTMLElement|null} the `.assetslisting-keywords` element, or null when
 *   there are no keywords and no empty-state text was provided
 */
export default function createKeywords(tags = [], smartTags = [], options = {}) {
  const list = document.createElement('ul');
  list.className = 'assetslisting-keywords';

  (tags || []).forEach((label) => list.append(createChip(label, false)));
  (smartTags || []).forEach((label) => list.append(createChip(label, true)));

  const total = list.children.length;
  if (options.limit && total > options.limit) {
    const overflow = createChip('+1', false);
    overflow.classList.add('assetslisting-keyword-overflow');
    list.append(overflow);
  }

  if (!total) {
    if (!options.empty) return null;
    const empty = document.createElement('li');
    empty.className = 'assetslisting-keywords-empty';
    empty.textContent = options.empty;
    list.append(empty);
  }

  return list;
}
