import { getRoute, subscribeRoute, navigate } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import { fetchAssetsList, displayLabel, DAM_ROOT } from '../../scripts/assets-api.js';

const ASSETS_LISTING_VIEW = 'assets-listing';

function createState(message) {
  const state = document.createElement('p');
  state.className = 'assetslisting-state';
  state.textContent = message;
  return state;
}

function folderTitle(path) {
  if (!path || path === DAM_ROOT) return 'Todos los assets';
  return path.split('/').pop();
}

function createFolderCard(folder) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'assetslisting-card assetslisting-card-folder';
  card.dataset.href = folder.path;

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb assetslisting-thumb-folder';
  thumb.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(folder);

  card.append(thumb, name);
  return card;
}

function createAssetCard(asset) {
  const card = document.createElement('figure');
  card.className = 'assetslisting-card assetslisting-card-asset';
  const label = displayLabel(asset);

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb';
  if (asset.path) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = label;
    img.src = asset.path;
    img.addEventListener('error', () => thumb.classList.add('is-empty'));
    thumb.append(img);
  } else {
    thumb.classList.add('is-empty');
  }

  const name = document.createElement('figcaption');
  name.className = 'assetslisting-name';
  name.textContent = label;

  card.append(thumb, name);

  if (asset.format) {
    const meta = document.createElement('span');
    meta.className = 'assetslisting-meta';
    meta.textContent = asset.format;
    card.append(meta);
  }

  return card;
}

function renderListing(block, data) {
  const folders = data.folders || [];
  const assets = data.assets || [];

  const header = document.createElement('div');
  header.className = 'assetslisting-header';
  const title = folderTitle(data.path);
  const total = folders.length + assets.length;
  header.innerHTML = `
    <p class="assetslisting-title">${title}</p>
    <p class="assetslisting-count">${total} elemento${total === 1 ? '' : 's'}</p>
  `;

  if (!total) {
    block.replaceChildren(header, createState('Esta carpeta está vacía'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'assetslisting-grid';

  folders.forEach((folder) => grid.append(createFolderCard(folder)));
  assets.forEach((asset) => grid.append(createAssetCard(asset)));

  block.replaceChildren(header, grid);
}

/**
 * Loads and decorates the assetslisting block.
 *
 * Reads `path` from the route and lists the folder contents (folders + assets)
 * in a grid, reacting to route changes without reloading the fragment.
 * @param {Element} block The assetslisting block element
 */
export default function decorate(block) {
  // In Universal Editor the route drives nothing; show a static placeholder and
  // don't mutate instrumented markup.
  if (isEditMode()) {
    block.replaceChildren(createState('Assets listing (vista dinámica en runtime)'));
    return;
  }

  let seq = 0;

  async function update(route) {
    const path = route.path || DAM_ROOT;
    const current = seq + 1;
    seq = current;
    block.replaceChildren(createState('Cargando assets...'));

    try {
      const data = await fetchAssetsList(path);
      if (current !== seq) return;
      renderListing(block, data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      if (current !== seq) return;
      block.replaceChildren(createState('No se pudieron cargar los assets'));
    }
  }

  // Folder cards navigate deeper (same shareable route contract as the nav).
  block.addEventListener('click', (event) => {
    const folderCard = event.target.closest('.assetslisting-card-folder');
    if (folderCard && folderCard.dataset.href) {
      navigate({ view: ASSETS_LISTING_VIEW, path: folderCard.dataset.href });
    }
  });

  update(getRoute());

  const unsubscribe = subscribeRoute((route) => {
    if (!block.isConnected) {
      unsubscribe();
      return;
    }
    if (route.view === ASSETS_LISTING_VIEW) update(route);
  });
}
