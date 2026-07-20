/*
 * Assembles the full listing shell from the region builders: the filters panel
 * plus a main column (actions bar, options bar and an empty content region that
 * renderContent populates once the listing data resolves).
 */

import createActionsBar from './actionsbar.js';
import createSelectionBar from './selectionbar.js';
import createOptionsBar from './optionsbar.js';
import createFiltersPanel from './filters.js';

/**
 * Builds the full listing shell.
 * @param {string} path Current DAM path
 * @param {{ filtersOpen: boolean, viewMode: string }} ui
 * @param {{ id: string, label: string }|null} [collection] active collection context
 * @returns {{ fragment: DocumentFragment, content: Element, workspace: Element }}
 */
export default function renderShell(path, ui, collection = null) {
  const fragment = document.createDocumentFragment();

  const panel = createFiltersPanel();

  const main = document.createElement('div');
  main.className = 'assetslisting-main';

  const content = document.createElement('div');
  content.className = 'assetslisting-content';

  // The workspace lays out the (optional) detail panel beside the card grid: the
  // detail panel claims a fixed track on the left and the grid takes the rest,
  // so the panel uses the listing's own space instead of overlaying it.
  const workspace = document.createElement('div');
  workspace.className = 'assetslisting-workspace';
  workspace.append(content);

  // The actions bar and options bar are pinned together as one fixed section at
  // the top of the workspace; the content region scrolls beneath them. The
  // selection bar sits between them and stays hidden until selection mode is on.
  const topbar = document.createElement('div');
  topbar.className = 'assetslisting-topbar';
  topbar.append(createActionsBar(path, collection), createSelectionBar(), createOptionsBar(ui));

  main.append(topbar, workspace);
  fragment.append(panel, main);

  return { fragment, content, workspace };
}
