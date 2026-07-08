import { fetchFolders } from './data.js';
import { createFolderNode, createFolderState } from './render.js';

const NAV_SELECTOR = '.assetsnavigation-link, .assetsnavigation-folder-button';

function setActiveNav(block, activeButton) {
  block.querySelectorAll(NAV_SELECTOR).forEach((button) => {
    button.setAttribute('aria-current', button === activeButton ? 'page' : 'false');
  });
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

    const button = event.target.closest(NAV_SELECTOR);
    if (!button || !block.contains(button)) return;

    setActiveNav(block, button);

    if (button.classList.contains('has-children')) {
      await toggleControlledGroup(button);
    }
  });
}
