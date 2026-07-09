import { fetchFolders, fetchFoldersReveal, ancestorPaths } from './data.js';
import {
  buildFolderNodes,
  createFolderNode,
  createFolderState,
  renderFolderTree,
} from './render.js';
import {
  getExpanded,
  setExpanded,
  addExpanded,
  removeExpanded,
} from './state.js';
import { navigate, subscribeRoute } from '../../scripts/router.js';
import { DAM_ROOT } from '../../scripts/assets-api.js';

export const ASSETS_LISTING_VIEW = 'assets-listing';

const NAV_SELECTOR = '.assetsnavigation-link, .assetsnavigation-folder-button';
const MAX_REVEAL_PATHS = 64;

function setActiveNav(block, activeButton) {
  block.querySelectorAll(NAV_SELECTOR).forEach((button) => {
    button.setAttribute('aria-current', button === activeButton ? 'page' : 'false');
  });
}

function findFolderButton(block, path) {
  if (!path) return null;
  return block.querySelector(
    `.assetsnavigation-folder-button[data-folder-href="${CSS.escape(path)}"]`,
  );
}

export function highlightRoute(block, route) {
  // assets-listing scoped to a folder -> highlight that folder if it's rendered.
  if (route.view === ASSETS_LISTING_VIEW && route.path) {
    setActiveNav(block, findFolderButton(block, route.path));
    return;
  }

  const link = block.querySelector(`.assetsnavigation-link[data-view="${route.view}"]`);
  setActiveNav(block, link);
}

function openFoldersSection(block) {
  const toggle = block.querySelector('.assetsnavigation-folders-toggle');
  const tree = block.querySelector('.assetsnavigation-folder-tree');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
  if (tree) tree.hidden = false;
}

/**
 * Unhides every ancestor group of the button (and marks its controlling folder
 * expanded + persisted), so a nested folder becomes visible.
 */
function expandAncestors(button) {
  let group = button.parentElement
    ? button.parentElement.closest('.assetsnavigation-folder-group')
    : null;

  while (group) {
    group.hidden = false;
    const controller = group.previousElementSibling;
    if (controller && controller.classList.contains('assetsnavigation-folder-button')) {
      controller.setAttribute('aria-expanded', 'true');
      addExpanded(controller.dataset.folderHref);
    }
    group = group.parentElement
      ? group.parentElement.closest('.assetsnavigation-folder-group')
      : null;
  }
}

async function loadChildFolders(button, group) {
  if (group.dataset.loaded === 'true') return;

  group.replaceChildren(createFolderState('Cargando carpetas...'));

  try {
    const folders = await fetchFolders(button.dataset.folderHref);
    group.replaceChildren();

    if (folders.length) {
      const level = Number(button.dataset.level || 0) + 1;
      folders.forEach((folder) => group.append(createFolderNode(folder, level)));
    }

    group.dataset.loaded = 'true';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    group.replaceChildren(createFolderState('No se pudieron cargar las subcarpetas'));
  }
}

async function toggleControlledGroup(button) {
  const controlId = button.getAttribute('aria-controls');
  const group = controlId ? document.getElementById(controlId) : button.nextElementSibling;
  if (!group) return;

  const wasExpanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', wasExpanded ? 'false' : 'true');
  group.hidden = wasExpanded;

  if (button.classList.contains('assetsnavigation-folder-button')) {
    const path = button.dataset.folderHref;
    if (wasExpanded) removeExpanded(path);
    else addExpanded(path);
    if (!wasExpanded) await loadChildFolders(button, group);
  }
}

/**
 * Builds the folder tree expanded down to the active path and to the user's
 * persisted expansions, in a single reveal request.
 * @param {Element} block the assetsnavigation block
 * @param {string} activePath the DAM path currently being viewed (may be empty)
 */
export async function revealTree(block, activePath) {
  const tree = block.querySelector('.assetsnavigation-folder-tree');
  if (!tree) return;

  tree.replaceChildren(createFolderState('Cargando carpetas...'));

  // Open = active path ancestor chain (from the URL) + the user's persisted set.
  const expanded = new Set([DAM_ROOT]);
  if (activePath) ancestorPaths(activePath).forEach((path) => expanded.add(path));
  getExpanded().forEach((path) => expanded.add(path));

  const paths = [...expanded].slice(0, MAX_REVEAL_PATHS);

  try {
    const levels = await fetchFoldersReveal(paths);
    renderFolderTree(tree, buildFolderNodes(levels, expanded, DAM_ROOT));

    // Self-heal persisted state: keep only paths that still resolve.
    setExpanded(new Set([...expanded].filter((path) => path !== DAM_ROOT && levels[path])));

    if (activePath && activePath !== DAM_ROOT) openFoldersSection(block);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    tree.replaceChildren(createFolderState('No se pudieron cargar las carpetas'));
  }
}

async function handleRouteChange(block, route) {
  if (route.view === ASSETS_LISTING_VIEW && route.path && route.path !== DAM_ROOT) {
    const button = findFolderButton(block, route.path);
    if (button) {
      openFoldersSection(block);
      expandAncestors(button);
    } else {
      // Deep path not in the tree yet (shared link / jump) -> reveal it.
      await revealTree(block, route.path);
    }
  }

  highlightRoute(block, route);
}

export default function bindAssetsNavigation(block) {
  block.addEventListener('click', async (event) => {
    const foldersToggle = event.target.closest('.assetsnavigation-folders-toggle');
    if (foldersToggle && block.contains(foldersToggle)) {
      toggleControlledGroup(foldersToggle);
      return;
    }

    // Primary nav -> route change. Active state is applied by the route
    // subscriber below, so back/forward and deep links stay in sync.
    const link = event.target.closest('.assetsnavigation-link');
    if (link && block.contains(link)) {
      if (link.dataset.view) navigate({ view: link.dataset.view });
      return;
    }

    const folderButton = event.target.closest('.assetsnavigation-folder-button');
    if (!folderButton || !block.contains(folderButton)) return;

    // Folder -> assets-listing scoped to its path, and toggle its own subtree.
    const path = folderButton.dataset.folderHref;
    if (path) navigate({ view: ASSETS_LISTING_VIEW, path });

    if (folderButton.classList.contains('has-children')) {
      await toggleControlledGroup(folderButton);
    }
  });

  // Keep the tree in sync with the route (deep links, back/forward, navigation
  // from the listing). Reveals + highlights the active folder.
  subscribeRoute((route) => handleRouteChange(block, route));
}
