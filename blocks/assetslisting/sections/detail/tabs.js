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
import {
  ICON_DATE, ICON_UPLOADED_BY, ICON_SIZE, ICON_DIMENSIONS, ICON_HASH,
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

/**
 * A stacked label-over-value field. Missing values still render — as
 * `NO_VALUE` — rather than being dropped, so the field list stays complete.
 * @param {string} label
 * @param {string} value
 */
function stackedField(label, value) {
  const field = document.createElement('div');
  field.className = 'assetslisting-field-stacked';

  const term = document.createElement('span');
  term.className = 'assetslisting-field-label';
  term.textContent = label;

  const detail = document.createElement('span');
  detail.className = 'assetslisting-field-value';
  detail.textContent = hasValue(value) ? value : NO_VALUE;

  field.append(term, detail);
  return field;
}

// Status values seen so far only cover the "approved" case (green). Anything
// else — including a status we haven't catalogued yet — falls back to a
// neutral gray dot rather than guessing a color for it.
const STATUS_STYLES = {
  aprobado: 'approved',
  approved: 'approved',
};

/**
 * The "Estado" field: a label over a colored dot + status pill, same shape
 * wherever it shows (here, and again next to the panel title — see panel.js).
 * `asset.status` is confirmed (AssetSerializer.detail() puts it at the top
 * level, from `dam:status`/`mango:state`), but the actual enum values it can
 * take aren't — only "aprobado"/"approved" has a catalogued color, so any
 * other status still renders (text as-is), just with a neutral gray dot
 * instead of guessing a color for it.
 */
export function statusBadge(status) {
  const badge = document.createElement('span');
  badge.className = 'assetslisting-status-badge';
  badge.dataset.status = STATUS_STYLES[String(status).toLowerCase()] || 'default';

  const dot = document.createElement('span');
  dot.className = 'assetslisting-status-dot';
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = status;

  badge.append(dot, label);
  return badge;
}

function statusField(asset) {
  const field = document.createElement('div');
  field.className = 'assetslisting-field-stacked';

  const term = document.createElement('span');
  term.className = 'assetslisting-field-label';
  term.textContent = 'Estado';

  let value;
  if (hasValue(asset.status)) {
    value = statusBadge(asset.status);
  } else {
    value = document.createElement('span');
    value.className = 'assetslisting-field-value';
    value.textContent = NO_VALUE;
  }

  field.append(term, value);
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
    statusField(asset),
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

  // Ref. comercial / Color Code / Temporada: custom product metadata, not yet
  // confirmed against the backend's actual property names — these keys
  // Confirmed against mango-assets-manager: AssetSerializer.detail() puts
  // `season` at the top level (composed from mango:season / seasonYear +
  // seasonNumber), while the commercial reference and color code are plain
  // metadata scalars that pass through its generic `metadata` map — property
  // names confirmed via the search-filters content fragments
  // (product-commercial-reference, product-color-code).
  const metadata = asset.metadata || {};
  panel.append(metaRows([
    { icon: ICON_HASH, label: 'Ref. comercial', value: metadata['mango:productCommercialReference'] },
    { icon: ICON_HASH, label: 'Color Code', value: metadata['mango:productColorCode'] },
    { icon: ICON_DATE, label: 'Temporada', value: asset.season },
  ]));

  return panel;
}

/**
 * A section heading — an uppercase label followed by a rule filling the rest
 * of the row (Figma: "IDENTIFICACIÓN ───", "TEMPORADA ───"...).
 */
function sectionTitle(label) {
  const title = document.createElement('div');
  title.className = 'assetslisting-section-title';
  const text = document.createElement('span');
  text.textContent = label;
  title.append(text);
  return title;
}

/** A labeled section: a `sectionTitle` followed by a row group. */
function section(label, rows) {
  const wrap = document.createElement('div');
  wrap.className = 'assetslisting-section';
  wrap.append(sectionTitle(label), rows);
  return wrap;
}

/**
 * A label-left / value-right row with no icon (the General tab's fields
 * don't carry one — only the Info tab's meta rows do). `value` can be a
 * plain string (rendered as text, `NO_VALUE` when missing) or a DOM node
 * (e.g. a status badge), appended as-is.
 */
function plainRow(label, value) {
  const row = document.createElement('div');
  row.className = 'assetslisting-plain-row';

  const term = document.createElement('span');
  term.className = 'assetslisting-plain-row-label';
  term.textContent = label;

  const detail = document.createElement('span');
  detail.className = 'assetslisting-plain-row-value';
  if (value instanceof Node) {
    detail.append(value);
  } else {
    detail.textContent = hasValue(value) ? value : NO_VALUE;
  }

  row.append(term, detail);
  return row;
}

/** A list of `plainRow`s. */
function plainRows(rows) {
  const list = document.createElement('div');
  list.className = 'assetslisting-plain-rows';
  rows.forEach(({ label, value }) => list.append(plainRow(label, value)));
  return list;
}

/**
 * A binary flag row: a (read-only) checkbox + label on the left, "Sí"/"No" on
 * the right. Unlike the other fields, an absent value here isn't "unknown
 * data" — these are toggle-shaped properties in the backend (see
 * search-filters' `enable-assets-journeys`/`state-coral-actions`, both
 * `type="toggle"`), so a missing/false property means the flag is off, not
 * that the value hasn't loaded — hence "No" instead of `NO_VALUE`.
 */
function flagRow(label, value) {
  const row = document.createElement('div');
  row.className = 'assetslisting-flag-row';

  const left = document.createElement('span');
  left.className = 'assetslisting-flag-row-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.disabled = true;
  checkbox.checked = value === true;
  const text = document.createElement('span');
  text.textContent = label;
  left.append(checkbox, text);

  const detail = document.createElement('span');
  detail.className = 'assetslisting-flag-row-value';
  detail.textContent = value === true ? 'Sí' : 'No';

  row.append(left, detail);
  return row;
}

function generalTab(asset) {
  const panel = document.createDocumentFragment();
  const metadata = asset.metadata || {};

  panel.append(section('Identificación', plainRows([
    { label: 'Title', value: asset.title },
    { label: 'Category', value: metadata['mango:category'] },
    { label: 'Subcategory', value: metadata['mango:subCategory'] },
    { label: 'Description', value: asset.description },
  ])));

  panel.append(section('Referencias comerciales', plainRows([
    { label: 'Base Comm. Ref.', value: metadata['mango:productBaseCommercialReference'] },
    { label: 'Color Code', value: metadata['mango:productColorCode'] },
    { label: 'Ref. Base + Color', value: metadata['mango:productCommercialReferenceBaseColor'] },
    { label: 'Base Design Style', value: metadata['mango:productBaseDesignStyle'] },
  ])));

  panel.append(section('Temporada', plainRows([
    { label: 'Season Number', value: metadata['mango:seasonNumber'] },
    { label: 'Season Code', value: metadata['mango:seasonCode'] },
    { label: 'Season Year', value: metadata['mango:seasonYear'] },
    { label: 'Session Code', value: metadata['mango:sessionCode'] },
  ])));

  const statusRows = plainRows([
    { label: 'Status', value: hasValue(asset.status) ? statusBadge(asset.status) : undefined },
  ]);
  // journeyCollection is a collection title (string), but the backend's own
  // filter treats it as a toggle (see search-filters/enable-assets-journeys,
  // type="toggle") — so "has a value" is read here as the flag being on.
  statusRows.append(
    flagRow('Is Relabeled', metadata['mango:isRelabeled'] === true),
    flagRow('Enable Assets Journeys', hasValue(metadata['mango:journeyCollection'])),
    flagRow('State Coral Actions', metadata['mango:usedByCoral'] === true),
  );
  panel.append(section('Estado y Flags', statusRows));

  // Upload Date / Roles: no backend property covers either (confirmed against
  // AssetSerializer.java and the full mango-assets-manager search — nothing
  // plausible to bind, unlike the Info tab's fields which just had the wrong
  // key). They stay NO_VALUE until the backend actually exposes them.
  panel.append(section('Sistema', plainRows([
    { label: 'Uploaded by', value: asset.createdBy },
    { label: 'Upload Date', value: undefined },
    { label: 'Dynamic Media URL', value: asset.dynamicUrl },
    { label: 'Poster URL', value: metadata['mango:posterUrl'] },
    { label: 'Streaming URL', value: metadata['mango:streamingUrl'] },
    { label: 'Roles', value: undefined },
  ])));

  return panel;
}

function productTab(asset) {
  const panel = document.createDocumentFragment();
  const metadata = asset.metadata || {};

  const rows = plainRows([
    { label: 'Division', value: metadata['mango:productDivision'] },
    { label: 'Sex', value: metadata['mango:productSex'] },
    { label: 'Age', value: metadata['mango:productAge'] },
    { label: 'Style Type', value: metadata['mango:productStyleType'] },
    { label: 'Theme', value: metadata['mango:productTheme'] },
    { label: 'Family', value: metadata['mango:productFamily'] },
    { label: 'Product Type', value: metadata['mango:productType'] },
    { label: 'Style Name', value: metadata['mango:productStyleName'] },
    { label: 'Color Name', value: metadata['mango:productColorName'] },
    { label: 'Fashion Degree', value: metadata['mango:productFashionDegree'] },
    { label: 'Moment', value: metadata['mango:productMoment'] },
    { label: 'Fabric', value: metadata['mango:productFabric'] },
    { label: 'Generic Material', value: metadata['mango:productGenericMaterialCode'] },
  ]);
  rows.append(flagRow('Has Plus Size', metadata['mango:productHasPlusSize'] === true));

  panel.append(section('Clasificación', rows));
  return panel;
}

function chip(text) {
  const el = document.createElement('span');
  el.className = 'assetslisting-chip';
  el.textContent = text;
  return el;
}

/** A "#tag" chip, for the Smart Tags group only — Keywords chips stay plain. */
function hashChip(text) {
  return chip(`#${text}`);
}

/** A color chip: a swatch in the given hex plus the hex code as its label. */
function colorChip(hex) {
  const el = document.createElement('span');
  el.className = 'assetslisting-chip assetslisting-chip-color';
  const swatch = document.createElement('span');
  swatch.className = 'assetslisting-chip-swatch';
  swatch.style.background = hex;
  swatch.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = hex;
  el.append(swatch, label);
  return el;
}

/**
 * A labeled group of chips (Smart Tags, Smart Color Tag, Keywords). Empty
 * groups still render — as `NO_VALUE` under the label — rather than being
 * dropped, so the tab's shape stays the same whether or not an asset has
 * values for it.
 */
function chipGroup(label, values, renderChip) {
  const group = document.createElement('div');
  group.className = 'assetslisting-chip-group';

  const heading = document.createElement('p');
  heading.className = 'assetslisting-field-label assetslisting-chip-group-title';
  heading.textContent = label;
  group.append(heading);

  if (!values || !values.length) {
    const empty = document.createElement('span');
    empty.className = 'assetslisting-chip-empty';
    empty.textContent = NO_VALUE;
    group.append(empty);
    return group;
  }

  const list = document.createElement('div');
  list.className = 'assetslisting-chips';
  values.forEach((value) => list.append(renderChip(value)));
  group.append(list);
  return group;
}

function imagenTab(asset) {
  const panel = document.createDocumentFragment();
  const metadata = asset.metadata || {};

  const imageViewRows = plainRows([
    { label: 'ID View', value: metadata['mango:idView'] },
    { label: 'ID View Desc', value: metadata['mango:idViewDescription'] },
    { label: 'Look Number', value: metadata['mango:lookNumber'] },
  ]);
  imageViewRows.append(
    flagRow('Is New Now', metadata['mango:isNewNow'] === true),
    flagRow('Is Featured', metadata['mango:isFeatured'] === true),
    flagRow('Is Acc Edition', metadata['mango:isAccEdition'] === true),
    plainRow('Image Cat. Dev', metadata['mango:imageCategory']),
  );
  panel.append(section('Image Views', imageViewRows));

  panel.append(section('Asset Generation', plainRows([
    { label: 'Generation Method', value: metadata['mango:generationMethod'] },
  ])));

  panel.append(section('Session Details', plainRows([
    { label: 'Session Type', value: metadata['mango:sessionType'] },
    { label: 'Session Code', value: metadata['mango:sessionCode'] },
  ])));

  const tags = document.createElement('div');
  tags.className = 'assetslisting-tags';
  tags.append(
    chipGroup('Smart Tags', asset.smartTags, hashChip),
    // Smart Color Tag: no dominant-color/palette property exists anywhere in
    // mango-assets-manager (confirmed by search) — always empty until the
    // backend actually adds one; unlike the other tabs' fields, there's no
    // plausible key to bind here yet.
    chipGroup('Smart Color Tag', null, colorChip),
    chipGroup(`Keywords (${(asset.tags || []).length})`, asset.tags, chip),
  );
  panel.append(section('Tags', tags));

  return panel;
}

function useTab(asset) {
  const panel = document.createDocumentFragment();
  const metadata = asset.metadata || {};

  const touchpointRows = document.createElement('div');
  touchpointRows.className = 'assetslisting-plain-rows';
  // Unlike Is Relabeled/State Coral Actions (backed by properties the Java
  // code explicitly types as Boolean — see RelabeledAssetsConstants), these
  // three are only known via the Lucene index definition, which doesn't say
  // the underlying JCR type — kept as a strict `=== true` check for now,
  // consistent with the other flags, but worth revisiting if it turns out
  // the backend stores them as strings instead.
  touchpointRows.append(
    flagRow('Internal Communication', metadata['mango:internalCommunicationTrigger'] === true),
    flagRow('Screens', metadata['mango:screens'] === true),
    flagRow('Displays', metadata['mango:displays'] === true),
  );
  panel.append(section('Touchpoints', touchpointRows));

  const rightsOfUse = document.createDocumentFragment();
  rightsOfUse.append(plainRows([
    { label: 'License Expiration', value: formatDate(metadata['mango:licenseExpiration']) },
  ]));
  // Rights Countries / Rights Touchpoints are multi-valued in the backend,
  // but AssetSerializer.metadataMap() drops any non-scalar property (see
  // scalar(), which returns null for anything that isn't a String/Number/
  // Boolean/Calendar) — so a list-valued mango:rightsCountries or
  // mango:rightsTouchpoints never survives into asset.metadata today. These
  // stay empty until the backend exposes them as something scalar (or the
  // detail endpoint special-cases them like it does renditions).
  rightsOfUse.append(
    chipGroup('Rights Countries', null, chip),
    chipGroup('Rights Touchpoints', null, chip),
  );
  rightsOfUse.append(plainRows([
    { label: 'License Status', value: metadata['mango:licenseStatus'] },
  ]));
  panel.append(section('Rights of Use', rightsOfUse));

  return panel;
}

// TABS below.

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
// Figma (node 283:14939) renamed/regrouped the old Metadatos+Keywords tabs
// into General/Product/Imagen/Use.
const TABS = [
  { id: 'info', label: 'Info', build: infoTab },
  { id: 'general', label: 'General', build: generalTab },
  { id: 'product', label: 'Product', build: productTab },
  { id: 'imagen', label: 'Imagen', build: imagenTab },
  { id: 'use', label: 'Use', build: useTab },
  { id: 'renditions', label: 'Renditions', build: renditionsTab },
];

export default TABS;
