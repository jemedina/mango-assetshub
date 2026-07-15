/*
 * DOM builders for the assets listing view.
 *
 * The listing is effectively a mini app, so its chrome is split into small,
 * self-contained factories: the actions bar (title + breadcrumb + primary
 * actions), the options bar (search + toolbar), the filters panel, and the
 * content area (folder/asset cards). Each returns detached nodes; wiring lives
 * in events.js.
 */

import { displayLabel, folderTitle, breadcrumbTrail } from './data.js';

function createButton(className, label, attributes = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });
  return button;
}

/* ---------------------------------------------------------------- actions bar */

function createBreadcrumb(path) {
  const nav = document.createElement('nav');
  nav.className = 'assetslisting-breadcrumb';
  nav.setAttribute('aria-label', 'Ruta de carpetas');

  const list = document.createElement('ol');
  list.className = 'assetslisting-breadcrumb-list';

  breadcrumbTrail(path).forEach((crumb) => {
    const item = document.createElement('li');
    item.className = 'assetslisting-breadcrumb-item';

    if (crumb.current) {
      const current = document.createElement('span');
      current.className = 'assetslisting-breadcrumb-current';
      current.setAttribute('aria-current', 'location');
      current.textContent = crumb.label;
      item.append(current);
    } else {
      const link = createButton('assetslisting-breadcrumb-link', crumb.label, {
        'data-href': crumb.path,
      });
      item.append(link);
    }

    list.append(item);
  });

  nav.append(list);
  return nav;
}

function createActionsBar(path) {
  const bar = document.createElement('div');
  bar.className = 'assetslisting-actionsbar';

  const heading = document.createElement('div');
  heading.className = 'assetslisting-heading';

  const title = document.createElement('h1');
  title.className = 'assetslisting-title';
  title.textContent = folderTitle(path);

  heading.append(title, createBreadcrumb(path));

  const actions = document.createElement('div');
  actions.className = 'assetslisting-actions';
  actions.append(
    createButton('assetslisting-button assetslisting-button-primary', 'Subir assets', {
      'data-action': 'upload',
    }),
    createButton('assetslisting-button assetslisting-button-secondary', 'Seleccionar', {
      'data-action': 'select',
    }),
  );

  bar.append(heading, actions);
  return bar;
}

/* ---------------------------------------------------------------- options bar */

function createViewToggle(viewMode) {
  const group = document.createElement('div');
  group.className = 'assetslisting-viewtoggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Modo de vista');

  [
    { mode: 'grid', label: 'Vista de cuadrícula', glyph: '▦' },
    { mode: 'list', label: 'Vista de lista', glyph: '☰' },
  ].forEach(({ mode, label, glyph }) => {
    const button = createButton('assetslisting-viewtoggle-button', glyph, {
      'data-action': 'set-view',
      'data-view-mode': mode,
      'aria-pressed': String(viewMode === mode),
      'aria-label': label,
      title: label,
    });
    group.append(button);
  });

  return group;
}

function createOptionsBar(ui) {
  const bar = document.createElement('div');
  bar.className = 'assetslisting-optionsbar';

  const search = document.createElement('div');
  search.className = 'assetslisting-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'assetslisting-search-input';
  input.placeholder = 'Buscar assets...';
  input.setAttribute('aria-label', 'Buscar assets');
  search.append(input);

  const toolbar = document.createElement('div');
  toolbar.className = 'assetslisting-toolbar';

  const sort = createButton('assetslisting-button assetslisting-button-ghost', 'Fecha de modificación', {
    'data-action': 'sort',
  });

  const filters = createButton('assetslisting-button assetslisting-button-ghost assetslisting-filters-toggle', 'Filtros', {
    'data-action': 'toggle-filters',
    'aria-expanded': String(ui.filtersOpen),
    'aria-controls': 'assetslisting-filters-panel',
  });

  toolbar.append(sort, filters, createViewToggle(ui.viewMode));

  bar.append(search, toolbar);
  return bar;
}

/* -------------------------------------------------------------- filters panel */

function createFiltersPanel() {
  const panel = document.createElement('aside');
  panel.className = 'assetslisting-filters-panel';
  panel.id = 'assetslisting-filters-panel';
  panel.setAttribute('aria-label', 'Filtros');
  panel.innerHTML = `
    <div class="assetslisting-filters-header">
      <p class="assetslisting-filters-title">Filtros</p>
    </div>
    <div class="assetslisting-filters-placeholder">filters tbd</div>
  `;
  return panel;
}

/* ------------------------------------------------------------------- content */

export function createState(message) {
  const state = document.createElement('p');
  state.className = 'assetslisting-state';
  state.textContent = message;
  return state;
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

/**
 * Renders the folder/asset grid (or the empty state) into the content region.
 * @param {Element} content The `.assetslisting-content` element
 * @param {{ folders?: Array, assets?: Array }} data
 */
export function renderContent(content, data) {
  const folders = data.folders || [];
  const assets = data.assets || [];

  if (!folders.length && !assets.length) {
    content.replaceChildren(createState('Esta carpeta está vacía'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'assetslisting-grid';
  folders.forEach((folder) => grid.append(createFolderCard(folder)));
  assets.forEach((asset) => grid.append(createAssetCard(asset)));

  content.replaceChildren(grid);
}

/**
 * Builds the full listing shell (actions bar, options bar, filters panel and an
 * empty content region). The content region is populated later by
 * renderContent once the listing data resolves.
 * @param {string} path Current DAM path
 * @param {{ filtersOpen: boolean, viewMode: string }} ui
 * @returns {{ fragment: DocumentFragment, content: Element }}
 */
export function renderShell(path, ui) {
  const fragment = document.createDocumentFragment();

  const panel = createFiltersPanel();

  const main = document.createElement('div');
  main.className = 'assetslisting-main';

  const content = document.createElement('div');
  content.className = 'assetslisting-content';

  main.append(createActionsBar(path), createOptionsBar(ui), content);
  fragment.append(panel, main);

  return { fragment, content };
}
