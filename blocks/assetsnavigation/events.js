/*
 * Interaction wiring for the navigation block. One delegated click handler on
 * the block covers the primary nav, the folders toggle and every folder button
 * (so re-rendered tree nodes need no rebinding), and a route subscription keeps
 * the tree revealed/highlighted in sync with deep links and back/forward.
 */

import { fetchFolders, fetchFoldersReveal, ancestorPaths } from './data.js';
import {
  buildFolderNodes,
  createFolderNode,
  createFolderState,
  renderFolderTree,
} from './render.js';
import { navigate, subscribeRoute } from '../../scripts/router.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
import { DAM_ROOT } from '../../scripts/assets-api.js';

const NAV_SELECTOR = '.assetsnavigation-link, .assetsnavigation-folder-button, '
  + '.assetsnavigation-collection-button';
const MAX_REVEAL_PATHS = 64;

// Expanded folder paths, in memory only. Deliberately NOT persisted: after a
// reload the tree restores just the folder being viewed and its ancestors
// (derived from the route in revealTree), so past exploration doesn't pile up
// across sessions. Within a session this keeps manual expansions alive when
// the tree is rebuilt from scratch (deep links via handleRouteChange).
const expandedPaths = new Set();

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

function findCollectionButton(block, id) {
  if (!id) return null;
  return block.querySelector(
    `.assetsnavigation-collection-button[data-collection-id="${CSS.escape(id)}"]`,
  );
}

export function highlightRoute(block, route) {
  // A collection is open (assets-listing carrying a collection filter) -> the
  // collection is the logical root, so highlight it, not any folder.
  if (route.view === ASSETS_LISTING_VIEW && route.filters?.collection) {
    setActiveNav(block, findCollectionButton(block, route.filters.collection));
    return;
  }

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
      if (controller.dataset.folderHref) expandedPaths.add(controller.dataset.folderHref);
    }
    group = group.parentElement
      ? group.parentElement.closest('.assetsnavigation-folder-group')
      : null;
  }
}

async function loadChildFolders(button, group) {
  if (group.dataset.loaded === 'true') return;

  group.replaceChildren(createFolderState('Cargando...'));

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

/**
 * Opens or closes the group a disclosure trigger controls.
 * @param {Element} button the trigger (section toggle or folder row)
 * @param {boolean} [expand] target state; omit to flip the current one
 */
async function setControlledGroup(button, expand) {
  const controlId = button.getAttribute('aria-controls');
  const group = controlId ? document.getElementById(controlId) : button.nextElementSibling;
  if (!group) return;

  const wasExpanded = button.getAttribute('aria-expanded') === 'true';
  const isExpanded = expand === undefined ? !wasExpanded : expand;
  if (isExpanded === wasExpanded) return;

  button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  group.hidden = !isExpanded;

  if (button.classList.contains('assetsnavigation-folder-button')) {
    const path = button.dataset.folderHref;
    if (isExpanded) {
      if (path) expandedPaths.add(path);
      await loadChildFolders(button, group);
    } else {
      expandedPaths.delete(path);
    }
  }
}

/**
 * Scrolls a folder row into view once it actually has layout. The sidebar is
 * mounted from the /leftnav fragment: the block is decorated — revealTree
 * included — while the fragment is still DETACHED (loadFragment builds it
 * off-DOM; scripts.js attaches the finished nav afterwards), and
 * scrollIntoView without layout is a silent no-op. So wait, frame by frame,
 * until the node is connected and rendered; bail after ~2s (frames only fire
 * on a visible page, and the editor never routes into a folder anyway).
 * @param {Element} button the folder row to reveal
 * @param {number} [framesLeft] retry budget in animation frames
 */
function scrollFolderIntoView(button, framesLeft = 120) {
  if (framesLeft <= 0) return;
  if (!button.isConnected || !button.offsetParent) {
    window.requestAnimationFrame(() => scrollFolderIntoView(button, framesLeft - 1));
    return;
  }
  button.scrollIntoView({ block: 'center', inline: 'nearest' });
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

  tree.replaceChildren(createFolderState('Cargando...'));

  // Open = the folder being viewed (you are inside it, so it comes back open)
  // with its ancestor chain, plus whatever was expanded earlier this session.
  // Route chain first: under MAX_REVEAL_PATHS it must win over stale extras.
  const expanded = new Set([DAM_ROOT]);
  if (activePath) {
    ancestorPaths(activePath).forEach((path) => expanded.add(path));
    expanded.add(activePath);
  }
  expandedPaths.forEach((path) => expanded.add(path));

  const paths = [...expanded].slice(0, MAX_REVEAL_PATHS);

  try {
    const levels = await fetchFoldersReveal(paths);
    renderFolderTree(tree, buildFolderNodes(levels, expanded, DAM_ROOT));

    // Self-heal the session set: keep only paths that still resolve.
    expandedPaths.clear();
    [...expanded]
      .filter((path) => path !== DAM_ROOT && levels[path])
      .forEach((path) => expandedPaths.add(path));

    if (activePath && activePath !== DAM_ROOT) {
      openFoldersSection(block);

      // Bring the restored folder into view: after a refresh (or a deep link
      // that rebuilt the tree) it may sit far down or — deeply indented —
      // past the right edge. Centering scrolls the -content scroller; inline
      // 'nearest' nudges the tree's horizontal scroll only when needed (the
      // proxy bar follows through its scroll listener).
      const active = findFolderButton(block, activePath);
      if (active) scrollFolderIntoView(active);
    }
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

/**
 * Wires the sticky proxy scrollbar (created in render.js) to the folder tree.
 * The tree's own horizontal bar is hidden in CSS; this keeps the proxy's
 * spacer sized to the tree's scrollWidth, mirrors scroll positions both ways,
 * and shows the proxy only while the tree actually overflows sideways. Bound
 * once: the tree and proxy elements persist across re-renders (revealTree
 * replaces the tree's children, never the tree itself).
 * @param {Element} block the assetsnavigation block
 */
function bindTreeScrollbar(block) {
  const tree = block.querySelector('.assetsnavigation-folder-tree');
  const bar = block.querySelector('.assetsnavigation-tree-scrollbar');
  if (!tree || !bar) return;
  const spacer = bar.firstElementChild;

  // Assigning an equal scrollLeft fires no scroll event, so mirroring settles
  // instead of ping-ponging between the two listeners.
  const mirror = (from, to) => {
    if (to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  };

  const update = () => {
    const overflowing = !tree.hidden && tree.scrollWidth > tree.clientWidth;
    bar.hidden = !overflowing;
    if (overflowing) {
      // The bar spans the full sidebar width, so its scrollport is wider than
      // the tree's. Sizing the spacer to the tree's overflow PLUS the bar's own
      // width makes both max scrollLefts equal, keeping the mirroring 1:1.
      // Read clientWidth after unhiding, or it measures 0.
      spacer.style.width = `${tree.scrollWidth - tree.clientWidth + bar.clientWidth}px`;
      mirror(tree, bar);
    }
  };

  tree.addEventListener('scroll', () => mirror(tree, bar), { passive: true });
  bar.addEventListener('scroll', () => mirror(bar, tree), { passive: true });

  // Anything that changes the tree's overflow: expand/collapse (hidden flips on
  // groups and on the tree itself), lazy-loaded children, re-renders.
  new MutationObserver(update).observe(tree, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });

  // Container-driven width changes (viewport resize past the 900px breakpoint).
  new ResizeObserver(update).observe(tree);

  update();
}

export default function bindAssetsNavigation(block) {
  bindTreeScrollbar(block);

  block.addEventListener('click', async (event) => {
    const foldersToggle = event.target.closest('.assetsnavigation-folders-toggle');
    if (foldersToggle && block.contains(foldersToggle)) {
      setControlledGroup(foldersToggle);
      return;
    }

    const collectionsToggle = event.target.closest('.assetsnavigation-collections-toggle');
    if (collectionsToggle && block.contains(collectionsToggle)) {
      setControlledGroup(collectionsToggle);
      return;
    }

    // Collection -> open it in the assets-listing view (reusing the same grid),
    // carrying a collection filter so the block swaps the data source and roots
    // the breadcrumb at the collection.
    const collectionButton = event.target.closest('.assetsnavigation-collection-button');
    if (collectionButton && block.contains(collectionButton)) {
      const { collectionId, collectionLabel } = collectionButton.dataset;
      if (collectionId) {
        navigate({
          view: ASSETS_LISTING_VIEW,
          filters: { collection: collectionId, collabel: collectionLabel || 'Colección' },
        });
      }
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

    const expandable = folderButton.classList.contains('has-children');

    // The arrow is a pure disclosure control: it expands/collapses the subtree
    // and never changes the route, so you can look inside a folder without
    // leaving the one you're viewing.
    if (expandable && event.target.closest('.ah-button-nav-chevron')) {
      await setControlledGroup(folderButton);
      return;
    }

    // The rest of the row selects the folder -> assets-listing scoped to its
    // path. Selecting only ever opens the subtree; re-clicking the folder you
    // are already in must not collapse it out from under you.
    const path = folderButton.dataset.folderHref;
    if (path) navigate({ view: ASSETS_LISTING_VIEW, path });

    if (expandable) {
      await setControlledGroup(folderButton, true);
    }
  });

  // Keep the tree in sync with the route (deep links, back/forward, navigation
  // from the listing). Reveals + highlights the active folder.
  subscribeRoute((route) => handleRouteChange(block, route));
}
