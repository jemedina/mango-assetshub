/*
 * Detail-panel tab definitions and content builders. Each tab is a small pure
 * builder that turns the asset detail object into a DOM subtree; the ordered
 * TABS registry (default export) drives both the nav and the panel bodies, so
 * adding a tab is a single entry here.
 */

import {
  displayLabel, formatSizeMb, formatDate, formatLabel,
} from '../../data.js';
import createPreview from '../../shared/preview.js';
import createKeywords from '../../shared/keywords.js';
import METADATA_FIELDS from './metadata-config.js';
import {
  ICON_COLLECTION, ICON_DATE, ICON_UPLOADED_BY, ICON_SIZE, ICON_DIMENSIONS,
} from './icons.js';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

const NO_VALUE = '—';

function emptyState(message) {
  const empty = document.createElement('p');
  empty.className = 'assetslisting-detail-empty';
  empty.textContent = message;
  return empty;
}

/** A definition list of side-by-side label/value rows; empty rows are dropped. */
function fieldList(rows) {
  const list = document.createElement('dl');
  list.className = 'assetslisting-fields';

  rows.filter((row) => hasValue(row.value)).forEach((row) => {
    const term = document.createElement('dt');
    term.textContent = row.label;
    const detail = document.createElement('dd');
    detail.textContent = row.value;
    list.append(term, detail);
  });

  return list;
}

/**
 * A stacked label-over-value field. Missing values still render — as
 * `NO_VALUE` — rather than being dropped, so the field list stays complete.
 * @param {string} label
 * @param {string} value
 * @param {string} [variant] extra modifier class on the value (e.g. 'body'
 *   for the description's smaller/regular type vs the name's default)
 */
function stackedField(label, value, variant) {
  const field = document.createElement('div');
  field.className = 'assetslisting-field-stacked';

  const term = document.createElement('span');
  term.className = 'assetslisting-field-label';
  term.textContent = label;

  const detail = document.createElement('span');
  detail.className = 'assetslisting-field-value';
  if (variant) detail.classList.add(`assetslisting-field-value-${variant}`);
  detail.textContent = hasValue(value) ? value : NO_VALUE;

  field.append(term, detail);
  return field;
}

/**
 * The "Colección" field: an icon + label row, same stacked-label styling as
 * Nombre/Descripción above it. Borrows the asset's first DAM keyword tag as a
 * best-effort stand-in for a dedicated field — the same convention the list
 * view's "Subcarpetas" column uses (see cards.js). Falls back to `NO_VALUE`
 * rather than being omitted when the asset has no tags.
 */
function collectionField(asset) {
  const category = asset.tags && asset.tags[0];

  const field = document.createElement('div');
  field.className = 'assetslisting-field-stacked';

  const term = document.createElement('span');
  term.className = 'assetslisting-field-label';
  term.textContent = 'Colección';

  const row = document.createElement('span');
  row.className = 'assetslisting-collection-row';
  const icon = document.createElement('span');
  icon.className = 'assetslisting-collection-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_COLLECTION;
  const value = document.createElement('span');
  value.className = 'assetslisting-collection-value';
  value.textContent = hasValue(category) ? category : NO_VALUE;
  row.append(icon, value);

  field.append(term, row);
  return field;
}

/**
 * One icon + label (left) / value (right) row. Missing values still render —
 * as `NO_VALUE` — rather than being dropped, so the row list stays complete.
 */
function metaRow(icon, label, value) {
  const row = document.createElement('div');
  row.className = 'assetslisting-meta-row';

  const left = document.createElement('span');
  left.className = 'assetslisting-meta-row-label';
  const iconEl = document.createElement('span');
  iconEl.className = 'assetslisting-meta-row-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML = icon;
  const labelText = document.createElement('span');
  labelText.textContent = label;
  left.append(iconEl, labelText);

  const valueEl = document.createElement('span');
  valueEl.className = 'assetslisting-meta-row-value';
  valueEl.textContent = hasValue(value) ? value : NO_VALUE;

  row.append(left, valueEl);
  return row;
}

/** A list of `metaRow`s. */
function metaRows(rows) {
  const list = document.createElement('div');
  list.className = 'assetslisting-meta-rows';
  rows.forEach(({ icon, label, value }) => list.append(metaRow(icon, label, value)));
  return list;
}

function dimensions(asset) {
  if (!asset.width || !asset.height) return '';
  return `${asset.width} × ${asset.height} px`;
}

function infoTab(asset) {
  const panel = document.createDocumentFragment();
  panel.append(
    stackedField('Nombre', displayLabel(asset)),
    stackedField('Descripción', asset.description, 'body'),
    collectionField(asset),
  );

  // Fechas: sólo las de autor (mango:authorCreated / mango:authorLastModified,
  // servidas como uploaded/modified). Las OOTB de publish no se leen porque
  // publish las regenera al importar; si el asset no las tiene, la fila queda
  // en NO_VALUE en vez de desaparecer.
  panel.append(metaRows([
    { icon: ICON_DATE, label: 'Modificado', value: formatDate(asset.modified) },
    { icon: ICON_DATE, label: 'Creado', value: formatDate(asset.uploaded) },
    { icon: ICON_UPLOADED_BY, label: 'Subido por', value: asset.createdBy },
    { icon: ICON_SIZE, label: 'Tamaño', value: formatSizeMb(asset.size) },
    { icon: ICON_DIMENSIONS, label: 'Dimensiones', value: dimensions(asset) },
  ]));

  return panel;
}

function metadataTab(asset) {
  const metadata = asset.metadata || {};
  const rows = METADATA_FIELDS
    .map((field) => ({ label: field.label, value: metadata[field.key] }))
    .filter((row) => hasValue(row.value));

  if (!rows.length) return emptyState('No hay metadatos disponibles');
  return fieldList(rows);
}

function keywordsTab(asset) {
  return createKeywords(asset.tags, asset.smartTags, { empty: 'Sin keywords' });
}

function renditionItem(rendition) {
  const item = document.createElement('li');
  item.className = 'assetslisting-rendition';

  const preview = createPreview(
    { path: rendition.path, format: rendition.mimeType },
    { variant: 'rendition' },
  );

  const meta = document.createElement('span');
  meta.className = 'assetslisting-rendition-meta';

  const name = document.createElement('span');
  name.className = 'assetslisting-rendition-name';
  name.textContent = rendition.name;

  const type = document.createElement('span');
  type.className = 'assetslisting-rendition-type';
  type.textContent = formatLabel(rendition.mimeType).toUpperCase();

  meta.append(name, type);
  item.append(preview, meta);
  return item;
}

function renditionsTab(asset) {
  const renditions = asset.renditions || [];
  if (!renditions.length) return emptyState('No hay renditions disponibles');

  const list = document.createElement('ul');
  list.className = 'assetslisting-renditions';
  renditions.forEach((rendition) => list.append(renditionItem(rendition)));
  return list;
}

/**
 * Ordered tab registry: id (also the panel key), nav label, body builder and
 * an optional `count`, appended to the label as "Label (N)" once the asset
 * detail loads (per the Figma tab bar) — omitted for tabs where a count
 * doesn't apply.
 */
const TABS = [
  { id: 'info', label: 'Info', build: infoTab },
  { id: 'metadata', label: 'Metadatos', build: metadataTab },
  {
    id: 'keywords',
    label: 'Keywords',
    build: keywordsTab,
    count: (asset) => (asset.tags || []).length + (asset.smartTags || []).length,
  },
  {
    id: 'renditions',
    label: 'Renditions',
    build: renditionsTab,
    count: (asset) => (asset.renditions || []).length,
  },
];

export default TABS;
