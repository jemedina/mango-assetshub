/*
 * ShareLinks block — the "Descargas recientes" view: assets recently shared
 * via Share Link, newest first. Front-only for now: the list below is mock
 * data; the real feed will come from the sharelink registry on author.
 */

// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';

const DEFAULT_TITLE = 'Descargas recientes';
const DEFAULT_EMPTY_MESSAGE = 'No hay descargas recientes';
const SUBTITLE = 'Digital Asset Management';

const ICON_DOWNLOAD = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 2v8m0 0 3-3m-3 3L5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON_COPY = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1" stroke="currentColor" stroke-width="1.1"/>
  <path d="M2.5 8.5h-.25A1.25 1.25 0 0 1 1 7.25v-5A1.25 1.25 0 0 1 2.25 1h5A1.25 1.25 0 0 1 8.5 2.25v.25" stroke="currentColor" stroke-width="1.1"/>
</svg>`;

const ICON_OPEN = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.5 2.5H3a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 11.5h6A1.5 1.5 0 0 0 10.5 10V7.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M7.5 1.5h4v4M11.25 1.75 6.5 6.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/*
 * Mock feed. `url` stands in for the real anonymous sharelink; `expires` is
 * pre-formatted because the backend will send display-ready dates.
 */
const MOCK_SHARELINKS = [
  {
    name: '87050534-43_SS26_eComm_Woman_Look01',
    email: 'maria.garcia@mango.com',
    expires: '19 jun 2026',
    url: 'https://example.mango.com/share/87050534-43',
  },
  {
    name: '67184400-99_SS26_eComm_Woman_Look09_A',
    email: 'carlos.ruiz@mango.com',
    expires: '19 jun 2026',
    url: 'https://example.mango.com/share/67184400-99',
  },
  {
    name: '67181011-99_FW25_eComm_Man_Look01',
    email: 'ana.martinez@mango.com',
    expires: '18 jun 2026',
    url: 'https://example.mango.com/share/67181011-99',
  },
  {
    name: '67290100-14_FW25_Campaign_Video_Hero',
    email: 'maria.garcia@mango.com',
    expires: '18 jun 2026',
    url: 'https://example.mango.com/share/67290100-14',
  },
  {
    name: '67181011-07_FW25_Campaign_Woman_Look03',
    email: 'javier.lópez@mango.com',
    expires: '17 jun 2026',
    url: 'https://example.mango.com/share/67181011-07',
  },
  {
    name: 'Mango_Brand_Guidelines_v3',
    email: 'elena.sanz@mango.com',
    expires: null,
    url: 'https://example.mango.com/share/brand-guidelines-v3',
  },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function createIconButton(label, icon, attributes = {}) {
  const button = el('button', 'btn btn-secondary');
  button.type = 'button';
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });

  const iconEl = el('span', 'btn-icon');
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.innerHTML = icon;

  button.append(iconEl, el('span', 'btn-label', label));
  return button;
}

/*
 * Reads the authored fields. The model emits one row per non-empty field in
 * order (title, maxItems, emptyMessage), but an author may leave any of them
 * blank — so rather than trusting positions, the single numeric row is taken
 * as maxItems and the remaining text rows as title / empty message in order.
 */
function readConfig(block) {
  const rows = [...block.children]
    .map((row) => row.textContent.trim())
    .filter(Boolean);
  const maxItems = parseInt(rows.find((value) => /^\d+$/.test(value)), 10);
  const texts = rows.filter((value) => !/^\d+$/.test(value));
  return {
    title: texts[0] || DEFAULT_TITLE,
    maxItems: Number.isNaN(maxItems) ? Infinity : maxItems,
    emptyMessage: texts[1] || DEFAULT_EMPTY_MESSAGE,
  };
}

/* The actions bar: same shared chrome as the assetslisting one, but purely
   informative — a title and a static subtitle, no actions. */
function createActionsBar(title) {
  const bar = el('div', 'sharelinks-actionsbar ah-actionsbar');
  const heading = el('div', 'ah-actionsbar-heading');
  heading.append(
    el('h1', 'ah-actionsbar-title', title),
    el('p', 'ah-actionsbar-subtitle', SUBTITLE),
  );
  bar.append(heading);
  return bar;
}

function createCard(item) {
  const card = el('li', 'sharelinks-card');

  const info = el('div', 'sharelinks-card-info');
  info.append(
    el('p', 'sharelinks-card-name', item.name),
    el('p', 'sharelinks-card-email', item.email),
  );

  const side = el('div', 'sharelinks-card-side');
  if (item.expires) {
    const expiry = el('div', 'sharelinks-card-expiry');
    expiry.append(
      el('span', 'sharelinks-card-expiry-label', 'Expira'),
      el('span', 'sharelinks-card-expiry-date', item.expires),
    );
    side.append(expiry);
  }
  side.append(
    createIconButton('Copiar', ICON_COPY, { 'data-action': 'copy', 'data-url': item.url }),
    createIconButton('Abrir', ICON_OPEN, { 'data-action': 'open', 'data-url': item.url }),
  );

  card.append(info, side);
  return card;
}

function createPanel(title, items, emptyMessage) {
  const panel = el('section', 'sharelinks-panel');

  const header = el('div', 'sharelinks-panel-header');
  const icon = el('span', 'sharelinks-panel-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_DOWNLOAD;

  const heading = el('div', 'sharelinks-panel-heading');
  heading.append(
    el('h2', 'sharelinks-panel-title', title),
    el('p', 'sharelinks-panel-count', `${items.length} compartidos vía Share Link`),
  );
  header.append(icon, heading);
  panel.append(header);

  if (items.length === 0) {
    panel.append(el('p', 'sharelinks-empty', emptyMessage));
    return panel;
  }

  const list = el('ul', 'sharelinks-list');
  items.forEach((item) => list.append(createCard(item)));
  panel.append(list);
  return panel;
}

/**
 * Loads and decorates the sharelinks block.
 * @param {Element} block The sharelinks block element
 */
export default function decorate(block) {
  // Same contract as assetslisting: Universal Editor keeps the instrumented
  // authored markup, so the runtime view is replaced by a static placeholder.
  if (isEditMode()) {
    const state = el('div', 'sharelinks-state', 'Descargas recientes (vista dinámica en runtime)');
    block.replaceChildren(state);
    return;
  }

  const { title, maxItems, emptyMessage } = readConfig(block);
  const items = MOCK_SHARELINKS.slice(0, maxItems);

  const topbar = el('div', 'sharelinks-topbar');
  topbar.append(createActionsBar(title));

  const main = el('div', 'sharelinks-main');
  main.append(createPanel(title, items, emptyMessage));

  block.replaceChildren(topbar, main);

  block.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'copy') {
      navigator.clipboard?.writeText(button.dataset.url);
    } else if (button.dataset.action === 'open') {
      window.open(button.dataset.url, '_blank', 'noopener');
    }
  });
}
