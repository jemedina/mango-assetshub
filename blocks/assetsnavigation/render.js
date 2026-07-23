/*
 * DOM builders for the navigation block: header, primary nav, the collapsible
 * folder tree (recursive folder nodes) and the user footer states. Pure
 * rendering — clicks are handled by the delegated listener in events.js, keyed
 * on the data-view / data-folder-href attributes set here.
 */

import { primaryNavItems, startLogin } from './data.js';
import { ICON_FOLDER, ICON_CHEVRON, ICON_COLLECTIONS } from './icons.js';

function createButton(className, text, attributes = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => {
    button.setAttribute(name, value);
  });
  return button;
}

/**
 * Header of the sidebar: the branding authored in the `/leftnav` fragment (a
 * logo reference and a plain-text label). Each field renders only when the
 * author filled it — no hardcoded wordmark or product name standing in, so an
 * empty header reads as unauthored rather than as a deliberate design.
 * @param {{ logo?: Element, label?: string }} branding authored header content
 * @returns {Element} the header element
 */
function createHeader({ logo, label } = {}) {
  const header = document.createElement('div');
  header.className = 'assetsnavigation-header';

  if (logo) {
    logo.className = 'assetsnavigation-logo';
    header.append(logo);
  }

  if (label) {
    const product = document.createElement('p');
    product.className = 'assetsnavigation-product';
    product.textContent = label;
    header.append(product);
  }

  return header;
}

function createPrimaryNavItem(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ah-button-nav assetsnavigation-link';
  button.dataset.navId = item.id;
  button.dataset.view = item.view;
  button.setAttribute('aria-current', 'false');

  const icon = document.createElement('span');
  icon.className = 'ah-button-nav-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = item.icon;

  const label = document.createElement('span');
  label.textContent = item.label;

  button.append(icon, label);
  return button;
}

function createPrimaryNav() {
  const nav = document.createElement('nav');
  nav.className = 'assetsnavigation-primary';
  nav.setAttribute('aria-label', 'Assets navigation');

  primaryNavItems.forEach((item) => {
    nav.append(createPrimaryNavItem(item));
  });

  return nav;
}

export function createFolderNode(folder, level = 0) {
  const item = document.createElement('li');
  item.className = 'assetsnavigation-folder-item';

  const hasAuthoredChildren = Array.isArray(folder.children) && folder.children.length > 0;
  const hasChildren = hasAuthoredChildren || Boolean(folder.hasChildren);
  const expanded = hasChildren && Boolean(folder.expanded);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'assetsnavigation-folder-button';
  button.dataset.folderId = folder.id;
  button.dataset.folderHref = folder.href || '';
  button.dataset.level = level;
  button.setAttribute('aria-current', 'false');

  const label = document.createElement('span');
  label.className = 'assetsnavigation-folder-label';
  label.textContent = folder.label;

  // Every folder looks the same: icon + label, grouped together (same pattern
  // as the "Carpetas" toggle) so an expandable one's trailing chevron can be
  // pushed to the far edge via space-between without spreading icon from label.
  const icon = document.createElement('span');
  icon.className = 'ah-button-nav-icon ah-button-nav-icon-sm';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_FOLDER;

  const labelGroup = document.createElement('span');
  labelGroup.className = 'ah-button-nav-group';
  labelGroup.append(icon, label);
  button.append(labelGroup);

  if (hasChildren) {
    button.classList.add('has-children');
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    const chevron = document.createElement('span');
    chevron.className = 'ah-button-nav-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = ICON_CHEVRON;
    button.append(chevron);
  }

  item.append(button);

  if (hasChildren) {
    const group = document.createElement('ul');
    group.className = 'assetsnavigation-folder-group';
    group.dataset.loaded = hasAuthoredChildren ? 'true' : 'false';
    group.hidden = !expanded;
    if (hasAuthoredChildren) {
      folder.children.forEach((child) => group.append(createFolderNode(child, level + 1)));
    }
    item.append(group);
  }

  return item;
}

/**
 * Turns a reveal response (map of path -> child folders) plus the set of paths
 * that should be open into a nested folder-node tree ready for createFolderNode.
 * @param {Object} levels map of folder path to its child folders
 * @param {Set<string>} expanded paths that must render expanded
 * @param {string} path the level to build from (the DAM root on the first call)
 * @returns {Array} nested folder nodes
 */
export function buildFolderNodes(levels, expanded, path) {
  const folders = levels[path] || [];
  return folders.map((folder) => {
    if (folder.hasChildren && expanded.has(folder.href) && levels[folder.href]) {
      const children = buildFolderNodes(levels, expanded, folder.href);
      return { ...folder, expanded: true, children };
    }
    return folder;
  });
}

function createFoldersToggle() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ah-button-nav ah-button-nav-section assetsnavigation-folders-toggle';
  button.id = 'assetsnavigation-folders-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'assetsnavigation-folder-tree');

  const group = document.createElement('span');
  group.className = 'ah-button-nav-group';

  const icon = document.createElement('span');
  icon.className = 'ah-button-nav-icon ah-button-nav-icon-sm';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_FOLDER;

  const label = document.createElement('span');
  label.textContent = 'Carpetas';

  group.append(icon, label);

  const chevron = document.createElement('span');
  chevron.className = 'ah-button-nav-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = ICON_CHEVRON;

  button.append(group, chevron);
  return button;
}

function createFolders(folders = []) {
  const section = document.createElement('section');
  section.className = 'assetsnavigation-folders';
  section.setAttribute('aria-labelledby', 'assetsnavigation-folders-toggle');

  const toggle = createFoldersToggle();

  const tree = document.createElement('ul');
  tree.id = 'assetsnavigation-folder-tree';
  tree.className = 'assetsnavigation-folder-tree';
  tree.hidden = true;

  if (folders.length) {
    folders.forEach((folder) => tree.append(createFolderNode(folder)));
  } else {
    const empty = document.createElement('li');
    empty.className = 'assetsnavigation-folder-state';
    empty.textContent = 'No hay carpetas disponibles';
    tree.append(empty);
  }

  section.append(toggle, tree);
  return section;
}

// -------------------------------------------------------------- collections

/** Loading / empty state row for the collections list (shares folder-state styling). */
function collectionState(message) {
  const state = document.createElement('li');
  state.className = 'assetsnavigation-folder-state';
  state.textContent = message;
  return state;
}

function createCollectionsToggle() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ah-button-nav ah-button-nav-section assetsnavigation-collections-toggle';
  button.id = 'assetsnavigation-collections-toggle';
  // Expanded by default: the collections list is the point of the section, so it
  // shows without a click (still collapsible, like "Carpetas").
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', 'assetsnavigation-collections-list');

  const group = document.createElement('span');
  group.className = 'ah-button-nav-group';

  const icon = document.createElement('span');
  icon.className = 'ah-button-nav-icon ah-button-nav-icon-sm';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_COLLECTIONS;

  const label = document.createElement('span');
  label.textContent = 'Colecciones';

  group.append(icon, label);

  const chevron = document.createElement('span');
  chevron.className = 'ah-button-nav-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = ICON_CHEVRON;

  button.append(group, chevron);
  return button;
}

/**
 * One collection row: same shape as a folder row (icon + label), plus a small
 * "Privada" badge so the private/public split the backend resolves is visible.
 * Clicking opens the collection (wired by the delegated handler in events.js off
 * the data-collection-* attributes).
 * @param {{ id: string, label: string, public?: boolean }} collection
 */
export function createCollectionItem(collection) {
  const item = document.createElement('li');
  item.className = 'assetsnavigation-collection-item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'assetsnavigation-collection-button';
  button.dataset.collectionId = collection.id;
  button.dataset.collectionLabel = collection.label;
  button.dataset.visibility = collection.public ? 'public' : 'private';
  button.setAttribute('aria-current', 'false');

  const icon = document.createElement('span');
  icon.className = 'ah-button-nav-icon ah-button-nav-icon-sm';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICON_COLLECTIONS;

  const label = document.createElement('span');
  label.className = 'assetsnavigation-collection-label';
  label.textContent = collection.label;

  const group = document.createElement('span');
  group.className = 'ah-button-nav-group';
  group.append(icon, label);
  button.append(group);

  if (!collection.public) {
    const badge = document.createElement('span');
    badge.className = 'assetsnavigation-collection-badge';
    badge.textContent = 'Privada';
    button.append(badge);
  }

  item.append(button);
  return item;
}

export function renderCollectionsList(list, collections) {
  list.replaceChildren();
  if (!collections.length) {
    list.append(collectionState('No hay colecciones disponibles'));
    return;
  }
  collections.forEach((collection) => list.append(createCollectionItem(collection)));
}

function createCollections() {
  const section = document.createElement('section');
  section.className = 'assetsnavigation-collections';
  section.setAttribute('aria-labelledby', 'assetsnavigation-collections-toggle');

  const list = document.createElement('ul');
  list.id = 'assetsnavigation-collections-list';
  list.className = 'assetsnavigation-collection-list';
  list.append(collectionState('Cargando colecciones...'));

  section.append(createCollectionsToggle(), list);
  return section;
}

function createContent(folders) {
  const content = document.createElement('div');
  content.className = 'assetsnavigation-content';
  content.append(createPrimaryNav(), createCollections(), createFolders(folders));
  return content;
}

function createUser() {
  const footer = document.createElement('div');
  footer.className = 'assetsnavigation-user';
  return footer;
}

export function renderUserLoading(footer) {
  const state = document.createElement('p');
  state.className = 'assetsnavigation-user-profile';
  state.textContent = 'Cargando usuario...';
  footer.replaceChildren(state);
}

export function renderUser(footer, { name, initials, role }) {
  const avatar = document.createElement('span');
  avatar.className = 'assetsnavigation-user-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = initials;

  const details = document.createElement('div');
  details.className = 'assetsnavigation-user-details';

  const nameEl = document.createElement('p');
  nameEl.className = 'assetsnavigation-user-name';
  nameEl.textContent = name;

  const roleEl = document.createElement('p');
  roleEl.className = 'assetsnavigation-user-role';
  roleEl.textContent = role;

  details.append(nameEl, roleEl);
  footer.replaceChildren(avatar, details);
}

export function renderUserLogin(footer) {
  const button = createButton('btn btn-primary assetsnavigation-login', 'Login');
  button.addEventListener('click', () => {
    startLogin();
  });
  footer.replaceChildren(button);
}

export function createFolderState(message) {
  const state = document.createElement('li');
  state.className = 'assetsnavigation-folder-state';
  state.textContent = message;
  return state;
}

export function renderFolderTree(tree, folders) {
  tree.replaceChildren();

  if (!folders.length) {
    tree.append(createFolderState('No hay carpetas disponibles'));
    return;
  }

  folders.forEach((folder) => tree.append(createFolderNode(folder)));
}

export default function renderAssetsNavigation(branding = {}, folders = []) {
  return [createHeader(branding), createContent(folders), createUser()];
}
