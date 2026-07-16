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
 * Builds a keyword chip list.
 * @param {string[]} [tags] authored tag labels
 * @param {string[]} [smartTags] machine-generated tag labels
 * @param {{ empty?: string }} [options] empty-state text (omit to render nothing)
 * @returns {HTMLElement|null} the `.assetslisting-keywords` element, or null when
 *   there are no keywords and no empty-state text was provided
 */
export default function createKeywords(tags = [], smartTags = [], options = {}) {
  const list = document.createElement('ul');
  list.className = 'assetslisting-keywords';

  (tags || []).forEach((label) => list.append(createChip(label, false)));
  (smartTags || []).forEach((label) => list.append(createChip(label, true)));

  if (!list.children.length) {
    if (!options.empty) return null;
    const empty = document.createElement('li');
    empty.className = 'assetslisting-keywords-empty';
    empty.textContent = options.empty;
    list.append(empty);
  }

  return list;
}
