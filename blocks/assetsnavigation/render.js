import { primaryNavItems, startLogin } from './data.js';
import { ICON_COLLECTIONS, ICON_CHEVRON } from './icons.js';

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

function createHeader() {
  const header = document.createElement('div');
  header.className = 'assetsnavigation-header';
  header.innerHTML = `
    <p class="assetsnavigation-app">MANGO</p>
    <p class="assetsnavigation-product">Digital Asset Management</p>
  `;
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
  const button = createButton('assetsnavigation-item assetsnavigation-folder-button', folder.label, {
    'data-folder-id': folder.id,
    'data-folder-href': folder.href || '',
    'data-level': level,
    'aria-current': 'false',
  });
  button.style.setProperty('--folder-level', level);

  if (hasChildren) {
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.classList.add('has-children');
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

function createContent(folders) {
  const content = document.createElement('div');
  content.className = 'assetsnavigation-content';
  content.append(createPrimaryNav(), createFolders(folders));
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

export function renderUser(footer, userId) {
  const name = document.createElement('p');
  name.className = 'assetsnavigation-user-name';
  name.textContent = userId;
  footer.replaceChildren(name);
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

export default function renderAssetsNavigation(folders = []) {
  return [createHeader(), createContent(folders), createUser()];
}
