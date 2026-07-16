/*
 * Assembles the full listing shell from the region builders: the filters panel
 * plus a main column (actions bar, options bar and an empty content region that
 * renderContent populates once the listing data resolves).
 */

import createActionsBar from './actionsbar.js';
import createOptionsBar from './optionsbar.js';
import createFiltersPanel from './filters.js';

/**
 * Builds the full listing shell.
 * @param {string} path Current DAM path
 * @param {{ filtersOpen: boolean, viewMode: string }} ui
 * @returns {{ fragment: DocumentFragment, content: Element }}
 */
export default function renderShell(path, ui) {
  const fragment = document.createDocumentFragment();

  const panel = createFiltersPanel();

  const main = document.createElement('div');
  main.className = 'assetslisting-main';

  const content = document.createElement('div');
  content.className = 'assetslisting-content';

  // The actions bar and options bar are pinned together as one fixed section at
  // the top of the workspace; the content region scrolls beneath them.
  const topbar = document.createElement('div');
  topbar.className = 'assetslisting-topbar';
  topbar.append(createActionsBar(path), createOptionsBar(ui));

  main.append(topbar, content);
  fragment.append(panel, main);

  return { fragment, content };
}
