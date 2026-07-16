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

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

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

/** A stacked label-over-value field; returns null when the value is empty. */
function stackedField(label, value) {
  if (!hasValue(value)) return null;
  const field = document.createElement('div');
  field.className = 'assetslisting-field-stacked';

  const term = document.createElement('span');
  term.className = 'assetslisting-field-label';
  term.textContent = label;

  const detail = document.createElement('span');
  detail.className = 'assetslisting-field-value';
  detail.textContent = value;

  field.append(term, detail);
  return field;
}

function dimensions(asset) {
  if (!asset.width || !asset.height) return '';
  return `${asset.width} × ${asset.height} px`;
}

function infoTab(asset) {
  const panel = document.createDocumentFragment();
  panel.append(stackedField('Nombre', displayLabel(asset)));

  const description = stackedField('Descripción', asset.description);
  if (description) panel.append(description);

  panel.append(fieldList([
    { label: 'Modificado', value: formatDate(asset.modified) },
    { label: 'Creado', value: formatDate(asset.created) },
    { label: 'Subido', value: formatDate(asset.uploaded) },
    { label: 'Subido por', value: asset.createdBy },
    { label: 'Tamaño', value: formatSizeMb(asset.size) },
    { label: 'Dimensiones', value: dimensions(asset) },
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

/** Ordered tab registry: id (also the panel key), nav label and body builder. */
const TABS = [
  { id: 'info', label: 'Info', build: infoTab },
  { id: 'metadata', label: 'Metadatos', build: metadataTab },
  { id: 'keywords', label: 'Keywords', build: keywordsTab },
  { id: 'renditions', label: 'Renditions', build: renditionsTab },
];

export default TABS;
