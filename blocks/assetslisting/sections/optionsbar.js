/*
 * Options bar: the asset search box plus the toolbar (sort, filters toggle and
 * the grid/list view toggle).
 */

import { el } from './dom.js';
import { ICON_SEARCH } from '../shared/icons.js';
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
    { mode: 'grid', label: 'Vista de cuadrícula', icon: 'ah-icon-view-grid' },
    { mode: 'list', label: 'Vista de lista', icon: 'ah-icon-view-list' },
  ].forEach(({ mode, label, icon }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'assetslisting-viewtoggle-button';
    button.dataset.action = 'set-view';
    button.dataset.viewMode = mode;
    button.setAttribute('aria-pressed', String(viewMode === mode));
    button.setAttribute('aria-label', label);
    button.title = label;

    // Masked SVG glyph — recolors via currentColor (see the viewtoggle CSS: the
    // active button is #111, the inactive one #888).
    const iconEl = el('span', `ah-icon ${icon}`);
    iconEl.setAttribute('aria-hidden', 'true');
    button.append(iconEl);

    group.append(button);
  });

  return group;
}

/**
 * Builds one field row in the sort menu: the field label plus a trailing
 * direction indicator ("↓ Desc" / "↑ Asc") that only shows on the active field
 * (CSS hides it otherwise; applySortState fills its text).
 * @param {{ field: string, label: string }} sortField
 * @param {boolean} isCurrent
 * @returns {HTMLLIElement}
 */
function createSortOption({ field, label: fieldLabel }, isCurrent) {
  const item = document.createElement('li');
  item.setAttribute('role', 'none');

  const option = document.createElement('button');
  option.type = 'button';
  option.className = 'assetslisting-sort-option';
  option.setAttribute('role', 'menuitemradio');
  option.dataset.action = 'set-sort-field';
  option.dataset.sortField = field;
  option.setAttribute('aria-current', String(isCurrent));

  option.append(
    el('span', 'assetslisting-sort-option-label', fieldLabel),
    el('span', 'assetslisting-sort-option-direction'),
  );
  item.append(option);
  return item;
}

/**
 * Builds the sort control: a trigger button (a decorative sort glyph, the
 * active field's label and its direction as a bare "↓" / "↑" arrow) that opens
 * a menu of the 4 sortable fields. There is no separate ASC/DESC control —
 * picking the already active field toggles its direction (see events.js), and
 * the active field's row shows the current direction inline.
 * @param {{ sortField: string, sortDirection: 'asc'|'desc' }} ui
 * @returns {HTMLElement}
 */
function createSortControl(ui) {
  const current = SORT_FIELDS.find(({ field }) => field === ui.sortField) || SORT_FIELDS[0];

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'assetslisting-sort-trigger';
  trigger.dataset.action = 'toggle-sort';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  const icon = el('span', 'ah-icon ah-icon-sorting assetslisting-sort-icon');
  icon.setAttribute('aria-hidden', 'true');
  trigger.append(
    icon,
    el('span', 'assetslisting-sort-label', current.label),
    // Direction arrow ("↓" / "↑"); applySortState keeps its text in sync.
    el('span', 'assetslisting-sort-direction'),
  );

  const menu = document.createElement('ul');
  menu.className = 'assetslisting-sort-menu dropdown-panel';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  SORT_FIELDS.forEach((sortField) => {
    menu.append(createSortOption(sortField, sortField.field === ui.sortField));
  });

  const root = document.createElement('div');
  root.className = 'dropdown assetslisting-sort';
  root.append(trigger, menu);
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

  // Built by hand (not createIconButton) so the leading glyph is the masked PNG
  // icon (ah-icon-filters → /icons/nav/filters-icon.png), matching the sort
  // glyph's icon system rather than an inline SVG.
  const filters = document.createElement('button');
  filters.type = 'button';
  filters.className = 'btn btn-secondary assetslisting-filters-toggle';
  filters.setAttribute('data-action', 'toggle-filters');
  filters.setAttribute('aria-expanded', String(ui.filtersOpen));
  filters.setAttribute('aria-controls', 'assetslisting-filters-panel');

  const filtersIcon = el('span', 'ah-icon ah-icon-filters assetslisting-filters-icon');
  filtersIcon.setAttribute('aria-hidden', 'true');
  filters.append(filtersIcon, el('span', 'btn-label', 'Filtros'));

  toolbar.append(createSortControl(ui), filters, createViewToggle(ui.viewMode));

  bar.append(createSearch(), count, toolbar);
  return bar;
}
