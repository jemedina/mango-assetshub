/*
 * Options bar: the asset search box plus the toolbar (sort, filters toggle and
 * the grid/list view toggle).
 */

import createButton from './dom.js';

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

/**
 * Builds the options bar.
 * @param {{ filtersOpen: boolean, viewMode: string }} ui
 * @returns {HTMLDivElement}
 */
export default function createOptionsBar(ui) {
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

  const sort = createButton('btn btn-secondary', 'Fecha de modificación', {
    'data-action': 'sort',
  });

  const filters = createButton('btn btn-secondary assetslisting-filters-toggle', 'Filtros', {
    'data-action': 'toggle-filters',
    'aria-expanded': String(ui.filtersOpen),
    'aria-controls': 'assetslisting-filters-panel',
  });

  toolbar.append(sort, filters, createViewToggle(ui.viewMode));

  bar.append(search, toolbar);
  return bar;
}
