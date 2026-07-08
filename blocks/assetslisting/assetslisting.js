import { getRoute, subscribeRoute, navigate } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import {
  fetchAssets,
  isFolderEntity,
  isAssetEntity,
  getLinkHref,
  toPathname,
  loadRenditionUrl,
} from '../../scripts/assets-api.js';

const ASSETS_LISTING_VIEW = 'assets-listing';
const ROOT_PATH = '/api/assets.json';

function createState(message) {
  const state = document.createElement('p');
  state.className = 'assetslisting-state';
  state.textContent = message;
  return state;
}

function toFolder(entity) {
  return {
    name: entity.properties?.name || 'Sin nombre',
    href: toPathname(getLinkHref(entity, 'self')),
  };
}

function toAsset(entity) {
  return {
    name: entity.properties?.name || 'Sin nombre',
    format: entity.properties?.metadata?.['dc:format'] || '',
    content: getLinkHref(entity, 'content'),
  };
}

function createFolderCard(folder) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'assetslisting-card assetslisting-card-folder';
  card.dataset.href = folder.href;
  card.innerHTML = `
    <span class="assetslisting-thumb assetslisting-thumb-folder" aria-hidden="true"></span>
    <span class="assetslisting-name">${folder.name}</span>
  `;
  return card;
}

function createAssetCard(asset) {
  const card = document.createElement('figure');
  card.className = 'assetslisting-card assetslisting-card-asset';

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = asset.name;
  thumb.append(img);

  const name = document.createElement('figcaption');
  name.className = 'assetslisting-name';
  name.textContent = asset.name;

  card.append(thumb, name);

  if (asset.format) {
    const meta = document.createElement('span');
    meta.className = 'assetslisting-meta';
    meta.textContent = asset.format;
    card.append(meta);
  }

  return { card, img };
}

/**
 * Loads an asset thumbnail asynchronously. Registers created object URLs for
 * later cleanup and bails out if the render became stale meanwhile.
 */
async function fillThumb(img, asset, register, isStale) {
  if (!asset.content) return;
  try {
    const url = await loadRenditionUrl(asset.content);
    if (isStale()) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      return;
    }
    if (url.startsWith('blob:')) register(url);
    img.src = url;
  } catch {
    img.closest('.assetslisting-thumb')?.classList.add('is-empty');
  }
}

function renderListing(block, data, register, isStale) {
  const entities = data.entities || [];
  const folders = entities.filter(isFolderEntity).map(toFolder);
  const assets = entities.filter(isAssetEntity).map(toAsset);

  const header = document.createElement('div');
  header.className = 'assetslisting-header';
  const title = data.properties?.name || 'Todos los assets';
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
  assets.forEach((asset) => {
    const { card, img } = createAssetCard(asset);
    grid.append(card);
    fillThumb(img, asset, register, isStale);
  });

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
  let objectUrls = [];
  const revoke = () => {
    objectUrls.forEach(URL.revokeObjectURL);
    objectUrls = [];
  };

  async function update(route) {
    const path = route.path || ROOT_PATH;
    const current = seq + 1;
    seq = current;
    revoke();
    block.replaceChildren(createState('Cargando assets...'));

    try {
      const data = await fetchAssets(path);
      if (current !== seq) return;
      renderListing(block, data, (url) => objectUrls.push(url), () => current !== seq);
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
      revoke();
      return;
    }
    if (route.view === ASSETS_LISTING_VIEW) update(route);
  });
}
