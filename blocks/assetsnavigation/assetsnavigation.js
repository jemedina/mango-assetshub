import bindAssetsNavigation from './events.js';
import { fetchFolders } from './data.js';
import renderAssetsNavigation, { createFolderState, renderFolderTree } from './render.js';

async function loadFolders(block) {
  const tree = block.querySelector('.assetsnavigation-folder-tree');
  if (!tree) return;

  tree.replaceChildren(createFolderState('Cargando carpetas...'));

  try {
    const folders = await fetchFolders();
    renderFolderTree(tree, folders);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    tree.replaceChildren(createFolderState('No se pudieron cargar las carpetas'));
  }
}

/**
 * Loads and decorates the assetsnavigation block.
 * @param {Element} block The assetsnavigation block element
 */
export default async function decorate(block) {
  block.replaceChildren(...renderAssetsNavigation());
  bindAssetsNavigation(block);
  await loadFolders(block);
}
