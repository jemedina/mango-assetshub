/*
 * Options bar: the asset search box plus the toolbar (sort, filters toggle and
 * the grid/list view toggle).
 */

import { createButton, createIconButton } from './dom.js';
import {
  ICON_SORT, ICON_FILTER, ICON_VIEW_GRID, ICON_VIEW_LIST, ICON_SEARCH,
} from '../shared/icons.js';
import { SORT_FIELDS } from '../shared/sort.js';

function createSearch() {
  const search = document.createElement('div');
  search.className = 'assetslisting-search';

  const icon = document.createElement('span');
  icon.className = 'assetslisting-search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_SEARCH;

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'assetslisting-search-input';
  input.placeholder = 'Buscar assets...';
  input.setAttribute('aria-label', 'Buscar assets');

  search.append(icon, input);
  return search;
}

function createViewToggle(viewMode) {
  const group = document.createElement('div');
  group.className = 'assetslisting-viewtoggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Modo de vista');

  [
    {
      mode: 'grid', label: 'Vista de cuadrícula', icon: ICON_VIEW_GRID,
    },
    {
      mode: 'list', label: 'Vista de lista', icon: ICON_VIEW_LIST,
    },
  ].forEach(({ mode, label, icon }) => {
    const button = createIconButton('assetslisting-viewtoggle-button', '', icon, {
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
 * Builds the sort control: a trigger (opens the field menu) and a direction
 * button side by side as a split button (same pattern as the view toggle),
 * plus the dropdown menu panel listing the 4 sortable fields.
 * @param {{ sortField: string, sortDirection: 'asc'|'desc' }} ui
 * @returns {HTMLElement}
 */
function createSortControl(ui) {
  const current = SORT_FIELDS.find(({ field }) => field === ui.sortField) || SORT_FIELDS[0];

  const trigger = createIconButton('assetslisting-sort-trigger', current.label, ICON_SORT, {
    'data-action': 'toggle-sort',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
  });

  const direction = createButton(
    'assetslisting-sort-direction',
    ui.sortDirection === 'asc' ? 'ASC' : 'DESC',
    {
      'data-action': 'toggle-sort-direction',
      'data-direction': ui.sortDirection,
      'aria-label': ui.sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente',
    },
  );

  const control = document.createElement('div');
  control.className = 'assetslisting-sort-control';
  control.append(trigger, direction);

  const menu = document.createElement('ul');
  menu.className = 'assetslisting-sort-menu dropdown-panel';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  SORT_FIELDS.forEach(({ field, label: fieldLabel }) => {
    const item = document.createElement('li');
    item.setAttribute('role', 'none');

    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'assetslisting-sort-option';
    option.setAttribute('role', 'menuitem');
    option.dataset.action = 'set-sort-field';
    option.dataset.sortField = field;
    option.setAttribute('aria-current', String(field === ui.sortField));
    option.textContent = fieldLabel;

    item.append(option);
    menu.append(item);
  });

  const root = document.createElement('div');
  root.className = 'dropdown assetslisting-sort';
  root.append(control, menu);
  return root;
}

/**
 * Builds the options bar.
 * @param {{ filtersOpen: boolean, viewMode: string, sortField: string, sortDirection: string }} ui
 * @returns {HTMLDivElement}
 */
export default function createOptionsBar(ui) {
  const bar = document.createElement('div');
  bar.className = 'assetslisting-optionsbar';

  const count = document.createElement('span');
  count.className = 'assetslisting-count';

  const toolbar = document.createElement('div');
  toolbar.className = 'assetslisting-toolbar';

  const filters = createIconButton('btn btn-secondary assetslisting-filters-toggle', 'Filtros', ICON_FILTER, {
    'data-action': 'toggle-filters',
    'aria-expanded': String(ui.filtersOpen),
    'aria-controls': 'assetslisting-filters-panel',
  });

  toolbar.append(createSortControl(ui), filters, createViewToggle(ui.viewMode));

  bar.append(createSearch(), count, toolbar);
  return bar;
}
