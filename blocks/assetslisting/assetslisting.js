import { getRoute, subscribeRoute, navigate } from '../../scripts/router.js';
// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import {
  fetchAssetsList, displayLabel, formatLabel, DAM_ROOT,
} from '../../scripts/assets-api.js';

const ASSETS_LISTING_VIEW = 'assets-listing';

// Formats with no raster preview: show the format's file icon + extension
// instead of attempting an <img> render.
const ICON_ONLY_FORMATS = new Map([
  ['pdf', 'file-pdf.svg'],
  ['svg', 'file-svg.svg'],
  ['wav', 'file-wav.svg'],
]);

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

  const body = document.createElement('span');
  body.className = 'assetslisting-body';

  const name = document.createElement('span');
  name.className = 'assetslisting-name';
  name.textContent = displayLabel(folder);
  body.append(name);

  card.append(thumb, body);
  return card;
}

function createAssetCard(asset) {
  const card = document.createElement('figure');
  card.className = 'assetslisting-card assetslisting-card-asset';
  const label = displayLabel(asset);

  const format = formatLabel(asset.format);

  const thumb = document.createElement('span');
  thumb.className = 'assetslisting-thumb';
  if (format && ICON_ONLY_FORMATS.has(format)) {
    const icon = document.createElement('img');
    icon.className = 'assetslisting-thumb-icon';
    icon.src = `${window.hlx.codeBasePath}/icons/${ICON_ONLY_FORMATS.get(format)}`;
    icon.alt = '';
    icon.loading = 'lazy';
    const ext = document.createElement('span');
    ext.className = 'assetslisting-thumb-ext';
    ext.textContent = `.${format}`;
    thumb.append(icon, ext);
  } else if (asset.path) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = label;
    img.src = asset.path;
    img.addEventListener('error', () => thumb.classList.add('is-empty'));
    thumb.append(img);
  } else {
    thumb.classList.add('is-empty');
  }

  if (format) {
    const badge = document.createElement('span');
    badge.className = 'assetslisting-format-badge';
    badge.dataset.format = format;
    badge.textContent = format;
    thumb.append(badge);
  }

  const body = document.createElement('span');
  body.className = 'assetslisting-body';

  const name = document.createElement('figcaption');
  name.className = 'assetslisting-name';
  name.textContent = label;
  body.append(name);

  if (asset.format) {
    const meta = document.createElement('span');
    meta.className = 'assetslisting-meta';
    meta.textContent = asset.format;
    body.append(meta);
  }

  card.append(thumb, body);

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
 *
 * The Figma spec also shows file size, last-modified date and DAM keyword
 * tags on each asset card. AssetsListServlet (mango-assets-manager) doesn't
 * return those fields yet — only name/title/path/format — so they're not
 * rendered here until the backend adds them to the /assets/list payload.
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
