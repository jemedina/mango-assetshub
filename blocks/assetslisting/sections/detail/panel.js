/*
 * Static DOM shell for the detail panel: header, preview image, tab nav, tab
 * body and the footer action buttons. Interaction is wired by the controller
 * (index.js) via a single delegated listener off the returned root, keyed on
 * the `data-action` / `data-tab` attributes set here.
 */

import { createIconButton } from '../dom.js';
import TABS from './tabs.js';
import {
  ICON_ASSET, ICON_EDIT, ICON_CLOSE, ICON_DOWNLOAD, ICON_SHARE, ICON_FOLDER_PLUS,
} from './icons.js';

function iconButton(className, label, action, svg) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `assetslisting-detail-iconbutton ${className}`;
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = svg;
  return button;
}

function createHeader() {
  const header = document.createElement('div');
  header.className = 'assetslisting-detail-header';

  const left = document.createElement('div');
  left.className = 'assetslisting-detail-header-left';

  const icon = document.createElement('span');
  icon.className = 'assetslisting-detail-header-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_ASSET;

  const title = document.createElement('span');
  title.className = 'assetslisting-detail-title';
  title.textContent = 'Detalles';

  // Empty until the asset detail resolves (see index.js's renderTabs, which
  // fills this in the same pass it updates the tab counts) — no status is
  // known yet when the shell is first built.
  const status = document.createElement('span');
  status.className = 'assetslisting-detail-header-status';

  left.append(icon, title, status);

  const actions = document.createElement('div');
  actions.className = 'assetslisting-detail-header-actions';
  actions.append(
    iconButton('assetslisting-detail-edit', 'Editar', 'detail-edit', ICON_EDIT),
    iconButton('assetslisting-detail-close', 'Cerrar', 'detail-close', ICON_CLOSE),
  );

  header.append(left, actions);
  return { header, status };
}

function createTabsNav() {
  const nav = document.createElement('div');
  nav.className = 'assetslisting-detail-tabs';
  nav.setAttribute('role', 'tablist');

  const tabButtons = new Map();
  TABS.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'assetslisting-detail-tab';
    button.dataset.tab = tab.id;
    button.setAttribute('role', 'tab');
    button.textContent = tab.label;
    tabButtons.set(tab.id, button);
    nav.append(button);
  });

  return { nav, tabButtons };
}

function createFooter() {
  const footer = document.createElement('div');
  footer.className = 'assetslisting-detail-footer';

  const download = createIconButton(
    'btn btn-primary assetslisting-detail-download',
    'Descargar',
    ICON_DOWNLOAD,
    { 'data-action': 'detail-download' },
  );

  const share = createIconButton(
    'btn btn-secondary assetslisting-detail-share',
    'Share',
    ICON_SHARE,
    { 'data-action': 'detail-share' },
  );

  // Icon-only (Figma: node 283:14939) — the label is only exposed via
  // aria-label/title, same pattern as the view-toggle buttons in optionsbar.js.
  const addToCollection = createIconButton(
    'btn btn-secondary assetslisting-detail-addcol',
    '',
    ICON_FOLDER_PLUS,
    { 'data-action': 'detail-add-to-collection', 'aria-label': 'Añadir a colección', title: 'Añadir a colección' },
  );

  footer.append(download, share, addToCollection);
  return footer;
}

/**
 * Builds the panel shell.
 * @returns {{
 *   root: HTMLElement, image: HTMLElement, nav: HTMLElement, body: HTMLElement,
 *   tabButtons: Map<string, HTMLButtonElement>, headerStatus: HTMLElement
 * }}
 */
export default function createDetailPanel() {
  const root = document.createElement('aside');
  root.className = 'assetslisting-detail';
  root.setAttribute('aria-label', 'Detalles del asset');

  const { header, status: headerStatus } = createHeader();

  // `imageWrap` carries the panel's inset padding; `image` is the muted,
  // rounded box the preview drops into — it's the handle the controller
  // (index.js) appends the preview into, so it must stay a stable reference.
  const imageWrap = document.createElement('div');
  imageWrap.className = 'assetslisting-detail-image';
  const image = document.createElement('div');
  image.className = 'assetslisting-detail-image-box';
  imageWrap.append(image);

  const { nav, tabButtons } = createTabsNav();

  const body = document.createElement('div');
  body.className = 'assetslisting-detail-body';

  const footer = createFooter();

  root.append(header, imageWrap, nav, body, footer);
  return {
    root, image, nav, body, tabButtons, headerStatus,
  };
}
