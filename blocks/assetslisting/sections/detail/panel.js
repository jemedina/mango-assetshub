/*
 * Static DOM shell for the detail panel: header, preview image, tab nav, tab
 * body and the footer action buttons. Interaction is wired by the controller
 * (index.js) via a single delegated listener off the returned root, keyed on
 * the `data-action` / `data-tab` attributes set here.
 */

import TABS from './tabs.js';

const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z"/></svg>';

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

  const title = document.createElement('span');
  title.className = 'assetslisting-detail-title';
  title.textContent = 'Detalles';

  const actions = document.createElement('div');
  actions.className = 'assetslisting-detail-header-actions';
  actions.append(
    iconButton('assetslisting-detail-edit', 'Editar', 'detail-edit', EDIT_ICON),
    iconButton('assetslisting-detail-close', 'Cerrar', 'detail-close', CLOSE_ICON),
  );

  header.append(title, actions);
  return header;
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

  const download = document.createElement('button');
  download.type = 'button';
  download.className = 'btn btn-primary assetslisting-detail-download';
  download.dataset.action = 'detail-download';
  download.textContent = 'Descargar';

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'btn btn-secondary assetslisting-detail-share';
  share.dataset.action = 'detail-share';
  share.textContent = 'Share';

  footer.append(download, share);
  return footer;
}

/**
 * Builds the panel shell.
 * @returns {{
 *   root: HTMLElement, image: HTMLElement, nav: HTMLElement, body: HTMLElement,
 *   tabButtons: Map<string, HTMLButtonElement>
 * }}
 */
export default function createDetailPanel() {
  const root = document.createElement('aside');
  root.className = 'assetslisting-detail';
  root.setAttribute('aria-label', 'Detalles del asset');

  const header = createHeader();
  const image = document.createElement('div');
  image.className = 'assetslisting-detail-image';

  const { nav, tabButtons } = createTabsNav();

  const body = document.createElement('div');
  body.className = 'assetslisting-detail-body';

  const footer = createFooter();

  root.append(header, image, nav, body, footer);
  return {
    root, image, nav, body, tabButtons,
  };
}
