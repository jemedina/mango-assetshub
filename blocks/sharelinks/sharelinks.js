/*
 * ShareLinks block — the "Descargas recientes" view: assets recently shared
 * via Share Link, newest first, read from the sharelink registry on author
 * through the publish bridge (scripts/sharelinks-api.js).
 *
 * Everyone sees every share, but only its creator can materialize the link
 * (`canSeeLink`), so Copiar/Abrir render disabled on other people's rows. The
 * link itself is derived per click — the listing never carries live URLs.
 */

// eslint-disable-next-line import/no-cycle
import { isEditMode } from '../../scripts/scripts.js';
import { fetchShareLinks, fetchShareLinkUrl, ShareLinkError } from '../../scripts/sharelinks-api.js';
import { formatDate } from '../../scripts/assets-api.js';

const DEFAULT_TITLE = 'Descargas recientes';
const DEFAULT_EMPTY_MESSAGE = 'No hay descargas recientes';
const SUBTITLE = 'Digital Asset Management';
const LOAD_ERROR_MESSAGE = 'No se han podido cargar las descargas recientes';
const NOT_OWNER_HINT = 'Solo quien creó el enlace puede usarlo';
const COPIED_FEEDBACK_MS = 2000;

/* Header + row-action glyphs come from the shared .ah-icon mask system
   (styles/icons.css): monochrome PNGs filled with currentColor, so they inherit
   each button's muted→strong hover exactly like the old inline SVGs did. */
const ICON_DOWNLOAD = '<span class="ah-icon ah-icon-download"></span>';
const ICON_COPY = '<span class="ah-icon ah-icon-copy"></span>';
const ICON_OPEN = '<span class="ah-icon ah-icon-open"></span>';

/* Copy-success feedback only; no PNG for it, so it stays an inline SVG. */
const ICON_CHECK = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="m2.5 7 2.8 2.8 5.2-6.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

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

/*
 * Display name of a share: the file name of its first shared path, plus how
 * many more items ride along ("lookbook.jpg (+3 paths)"). The OOTB share stores
 * paths only, so the node name is the closest thing to a title.
 */
function shareName(share) {
  const paths = share.paths || [];
  if (paths.length === 0) return share.id;
  const first = paths[0].split('/').pop();
  return paths.length > 1 ? `${first} (+${paths.length - 1} paths)` : first;
}

function createCard(share) {
  const card = el('li', 'sharelinks-card');

  const info = el('div', 'sharelinks-card-info');
  info.append(
    el('p', 'sharelinks-card-name', shareName(share)),
    el('p', 'sharelinks-card-email', share.createdBy),
  );

  const side = el('div', 'sharelinks-card-side');
  if (share.expirationDate) {
    const expiry = el('div', 'sharelinks-card-expiry');
    expiry.append(
      el('span', 'sharelinks-card-expiry-label', 'Expira'),
      el('span', 'sharelinks-card-expiry-date', formatDate(share.expirationDate)),
    );
    side.append(expiry);
  }

  const copy = createIconButton('Copiar', ICON_COPY, { 'data-action': 'copy', 'data-id': share.id });
  const open = createIconButton('Abrir', ICON_OPEN, { 'data-action': 'open', 'data-id': share.id });
  // Not the creator: the buttons stay visible so the row reads the same for
  // everyone, but disabled — author re-checks ownership regardless.
  if (!share.canSeeLink) {
    [copy, open].forEach((button) => {
      button.disabled = true;
      button.title = NOT_OWNER_HINT;
    });
  }
  side.append(copy, open);

  card.append(info, side);
  return card;
}

function createPanel(title, emptyMessage) {
  const panel = el('section', 'sharelinks-panel');

  const header = el('div', 'sharelinks-panel-header');
  const icon = el('span', 'sharelinks-panel-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_DOWNLOAD;

  const heading = el('div', 'sharelinks-panel-heading');
  heading.append(
    el('h2', 'sharelinks-panel-title', title),
    el('p', 'sharelinks-panel-count', 'Compartidos vía Share Link'),
  );
  header.append(icon, heading);
  panel.append(header);

  const body = el('div', 'sharelinks-panel-body');
  body.append(el('p', 'sharelinks-status', 'Cargando…'));
  panel.append(body);

  panel.renderShares = (shares) => {
    if (shares.length === 0) {
      body.replaceChildren(el('p', 'sharelinks-empty', emptyMessage));
      return;
    }
    const count = panel.querySelector('.sharelinks-panel-count');
    count.textContent = `${shares.length} compartidos vía Share Link`;
    const list = el('ul', 'sharelinks-list');
    shares.forEach((share) => list.append(createCard(share)));
    body.replaceChildren(list);
  };

  panel.renderError = (message) => {
    body.replaceChildren(el('p', 'sharelinks-status sharelinks-status-error', message));
  };

  return panel;
}

/* Transient per-button feedback: swaps icon and label for a moment ("Copiado"),
   then restores the original content. */
function flashButton(button, label, icon, className) {
  const iconEl = button.querySelector('.btn-icon');
  const labelEl = button.querySelector('.btn-label');
  const previous = { icon: iconEl.innerHTML, label: labelEl.textContent };
  iconEl.innerHTML = icon;
  labelEl.textContent = label;
  if (className) button.classList.add(className);
  button.disabled = true;
  setTimeout(() => {
    iconEl.innerHTML = previous.icon;
    labelEl.textContent = previous.label;
    if (className) button.classList.remove(className);
    button.disabled = false;
  }, COPIED_FEEDBACK_MS);
}

async function handleAction(button) {
  const { action, id } = button.dataset;
  try {
    const url = await fetchShareLinkUrl(id);
    if (action === 'copy') {
      await navigator.clipboard?.writeText(url);
      flashButton(button, 'Copiado', ICON_CHECK, 'sharelinks-copied');
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch (e) {
    const message = e instanceof ShareLinkError ? e.message : 'No se ha podido generar el enlace';
    flashButton(button, message, ICON_COPY, 'sharelinks-action-error');
  }
}

/**
 * Loads and decorates the sharelinks block.
 * @param {Element} block The sharelinks block element
 */
export default async function decorate(block) {
  const { title, maxItems, emptyMessage } = readConfig(block);

  const topbar = el('div', 'sharelinks-topbar');
  topbar.append(createActionsBar(title));

  const main = el('div', 'sharelinks-main');
  const panel = createPanel(title, emptyMessage);
  main.append(panel);
  block.replaceChildren(topbar, main);

  // Universal Editor: render the real shell — header and panel chrome — so
  // authors preview what they configure (title, empty message), but skip the
  // data fetch. The instrumentation lives on the block element itself, which
  // is left untouched, so the properties panel keeps working. data-edit-preview
  // keeps the topbar in flow: inside the editor iframe there is no app chrome
  // (leftnav) to pin a fixed bar to.
  if (isEditMode()) {
    block.dataset.editPreview = 'true';
    panel.renderShares([]);
    return;
  }

  block.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    handleAction(button);
  });

  try {
    const { shares } = await fetchShareLinks();
    panel.renderShares(shares.slice(0, maxItems));
  } catch (e) {
    panel.renderError(LOAD_ERROR_MESSAGE);
  }
}
