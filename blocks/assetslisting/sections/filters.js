/*
 * Filters panel — the second left nav. Renders one collapsible section per
 * published search-filter definition (from /bin/assetshub/settings/search-filters)
 * and supports the 6 authorable field types: singleLineText, checkBoxes,
 * radioButtons, toggle, choiceChips and dateRange.
 *
 * The panel is presentation-only: the active filter values live with the block
 * controller (they survive the shell rebuild on navigation) and are re-applied
 * here on render; readFilters() reads the current DOM state back into that
 * canonical `{ property: value }` shape after every user change.
 */

import { el } from './dom.js';
import { ICON_CHEVRON_DOWN } from '../shared/icons.js';

const UNFILTERED_LABEL = 'Sin filtrar';

/**
 * Builds the (initially empty) filters panel; renderFilters() fills it once the
 * definitions resolve. The open/closed layout is driven from CSS via the
 * block's data-filters-open attribute.
 * @returns {HTMLElement}
 */
export default function createFiltersPanel() {
  const panel = document.createElement('aside');
  panel.className = 'assetslisting-filters-panel';
  panel.id = 'assetslisting-filters-panel';
  panel.setAttribute('aria-label', 'Filtros');
  panel.innerHTML = `
    <div class="assetslisting-filters-header">
      <p class="assetslisting-filters-title">Filtros</p>
      <button type="button" class="assetslisting-filters-clear">Limpiar</button>
      <button type="button" class="assetslisting-filters-close" aria-label="Cerrar filtros">&times;</button>
    </div>
    <div class="assetslisting-filters-list">
      <p class="assetslisting-filters-empty">Cargando filtros...</p>
    </div>
  `;
  return panel;
}

function createTextField(filter, active) {
  const input = el('input', 'assetslisting-filter-text');
  input.type = 'text';
  if (filter.placeholder) input.placeholder = filter.placeholder;
  input.setAttribute('aria-label', filter.label || '');
  if (typeof active === 'string') input.value = active;
  return input;
}

function createOptionRow(type, name, option, checked) {
  const row = el('label', 'assetslisting-filter-option');
  const input = el('input');
  input.type = type;
  input.name = name;
  input.value = option.value;
  input.checked = checked;
  row.append(input, el('span', 'assetslisting-filter-option-label', option.title));
  return row;
}

function createCheckBoxes(filter, active) {
  const group = el('div', 'assetslisting-filter-options');
  const picked = new Set(Array.isArray(active) ? active : []);
  (filter.options || []).forEach((option) => {
    group.append(createOptionRow('checkbox', `ah-filter-${filter.id}`, option, picked.has(option.value)));
  });
  return group;
}

function createRadioButtons(filter, active) {
  const group = el('div', 'assetslisting-filter-options');
  // A leading "unfiltered" option so a radio choice can be undone.
  const options = [{ title: UNFILTERED_LABEL, value: '' }, ...(filter.options || [])];
  options.forEach((option) => {
    const checked = option.value === '' ? active == null : active === option.value;
    group.append(createOptionRow('radio', `ah-filter-${filter.id}`, option, checked));
  });
  return group;
}

function createToggle(filter, active) {
  const group = el('div', 'assetslisting-filter-options');
  // A boolean filter has three useful states: unset, true and false.
  [
    { title: UNFILTERED_LABEL, value: '' },
    { title: 'Sí', value: 'true' },
    { title: 'No', value: 'false' },
  ].forEach((option) => {
    const checked = option.value === '' ? typeof active !== 'boolean' : active === (option.value === 'true');
    group.append(createOptionRow('radio', `ah-filter-${filter.id}`, option, checked));
  });
  return group;
}

function createChoiceChips(filter, active) {
  const group = el('div', 'assetslisting-filter-chips');
  const picked = new Set(Array.isArray(active) ? active : []);
  (filter.options || []).forEach((option) => {
    const chip = el('button', 'assetslisting-filter-chip', option.title);
    chip.type = 'button';
    chip.dataset.value = option.value;
    chip.setAttribute('aria-pressed', String(picked.has(option.value)));
    group.append(chip);
  });
  return group;
}

function createDateRange(filter, active) {
  const group = el('div', 'assetslisting-filter-dates');
  const range = active && typeof active === 'object' ? active : {};
  // For dateRange the authored options carry the bound labels (from, to).
  const labels = filter.options || [];
  [
    { bound: 'from', label: (labels[0] && labels[0].title) || 'Desde', value: range.from },
    { bound: 'to', label: (labels[1] && labels[1].title) || 'Hasta', value: range.to },
  ].forEach(({ bound, label, value }) => {
    const field = el('label', 'assetslisting-filter-date');
    const input = el('input');
    input.type = 'date';
    input.dataset.bound = bound;
    if (value) input.value = value;
    field.append(el('span', 'assetslisting-filter-date-label', label), input);
    group.append(field);
  });
  return group;
}

const FIELD_BUILDERS = {
  singleLineText: createTextField,
  checkBoxes: createCheckBoxes,
  radioButtons: createRadioButtons,
  toggle: createToggle,
  choiceChips: createChoiceChips,
  dateRange: createDateRange,
};

function createFilterSection(filter, active) {
  const section = el('section', 'assetslisting-filter');
  section.dataset.property = filter.property;
  section.dataset.type = filter.type;

  const header = el('button', 'assetslisting-filter-header');
  header.type = 'button';
  header.setAttribute('aria-expanded', 'true');
  const chevron = el('span', 'assetslisting-filter-chevron');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = ICON_CHEVRON_DOWN;
  header.append(el('span', 'assetslisting-filter-label', filter.label || filter.id), chevron);

  const body = el('div', 'assetslisting-filter-body');
  body.append(FIELD_BUILDERS[filter.type](filter, active));

  section.append(header, body);
  return section;
}

/**
 * Renders the filter sections into the panel, reflecting the active values.
 * Definitions with an unknown type are skipped (a newer config than this code).
 * @param {HTMLElement} panel The panel from createFiltersPanel
 * @param {Array<Object>} defs Filter definitions from the settings endpoint
 * @param {Object} active Active values keyed by filter property
 */
export function renderFilters(panel, defs, active = {}) {
  const list = panel.querySelector('.assetslisting-filters-list');
  if (!list) return;

  const known = (defs || []).filter((filter) => FIELD_BUILDERS[filter.type]);
  if (!known.length) {
    list.replaceChildren(el('p', 'assetslisting-filters-empty', 'No hay filtros configurados'));
    return;
  }
  list.replaceChildren(
    ...known.map((filter) => createFilterSection(filter, active[filter.property])),
  );
}

function readSection(section) {
  const { type } = section.dataset;

  if (type === 'singleLineText') {
    const value = (section.querySelector('.assetslisting-filter-text')?.value || '').trim();
    return value || null;
  }

  if (type === 'checkBoxes') {
    const values = [...section.querySelectorAll('input:checked')].map((input) => input.value);
    return values.length ? values : null;
  }

  if (type === 'radioButtons') {
    const value = section.querySelector('input:checked')?.value;
    return value || null;
  }

  if (type === 'toggle') {
    const value = section.querySelector('input:checked')?.value;
    return value ? value === 'true' : null;
  }

  if (type === 'choiceChips') {
    const values = [...section.querySelectorAll('.assetslisting-filter-chip[aria-pressed="true"]')]
      .map((chip) => chip.dataset.value);
    return values.length ? values : null;
  }

  if (type === 'dateRange') {
    const from = section.querySelector('input[data-bound="from"]')?.value;
    const to = section.querySelector('input[data-bound="to"]')?.value;
    if (!from && !to) return null;
    const range = {};
    if (from) range.from = from;
    if (to) range.to = to;
    return range;
  }

  return null;
}

/**
 * Reads the active filter values back out of the panel DOM, in the wire shape
 * the search endpoints expect: `{ property: value }` with inactive filters
 * omitted entirely.
 * @param {HTMLElement} panel
 * @returns {Object}
 */
export function readFilters(panel) {
  const filters = {};
  panel.querySelectorAll('.assetslisting-filter').forEach((section) => {
    const value = readSection(section);
    if (value != null) filters[section.dataset.property] = value;
  });
  return filters;
}
