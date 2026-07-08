import { fetchFolders } from './data.js';
import { createFolderNode, createFolderState } from './render.js';
import { navigate, subscribeRoute } from '../../scripts/router.js';

const NAV_SELECTOR = '.assetsnavigation-link, .assetsnavigation-folder-button';

function setActiveNav(block, activeButton) {
  block.querySelectorAll(NAV_SELECTOR).forEach((button) => {
    button.setAttribute('aria-current', button === activeButton ? 'page' : 'false');
  });
}

const ASSETS_LISTING_VIEW = 'assets-listing';

function highlightRoute(block, route) {
  // assets-listing scoped to a folder -> highlight that folder if it's rendered.
  if (route.view === ASSETS_LISTING_VIEW && route.path) {
    const folder = block.querySelector(
      `.assetsnavigation-folder-button[data-folder-href="${route.path}"]`,
    );
    setActiveNav(block, folder || null);
    return;
  }

  const link = block.querySelector(`.assetsnavigation-link[data-view="${route.view}"]`);
  setActiveNav(block, link);
}

async function loadChildFolders(button, group) {
  if (group.dataset.loaded === 'true') return;

  group.replaceChildren(createFolderState('Cargando carpetas...'));

  try {
    const folders = await fetchFolders(button.dataset.folderHref);
    group.replaceChildren();

    if (!folders.length) {
      group.append(createFolderState('No hay subcarpetas'));
    } else {
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

  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  group.hidden = expanded;

  if (!expanded && button.classList.contains('assetsnavigation-folder-button')) {
    await loadChildFolders(button, group);
  }
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

    // Folder -> assets-listing scoped to its path (active state via the route).
    const path = folderButton.dataset.folderHref;
    if (path) navigate({ view: ASSETS_LISTING_VIEW, path });

    if (folderButton.classList.contains('has-children')) {
      await toggleControlledGroup(folderButton);
    }
  });

  // Reflect the active nav from the route (deep links, back/forward, default).
  subscribeRoute((route) => highlightRoute(block, route));
}
