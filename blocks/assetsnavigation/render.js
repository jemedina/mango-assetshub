import { primaryNavItems, AUTH_STATUS_PATH } from './data.js';

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
    <p class="assetsnavigation-app">Mango</p>
    <p class="assetsnavigation-product">Digital Asset Management</p>
  `;
  return header;
}

function createPrimaryNav() {
  const nav = document.createElement('nav');
  nav.className = 'assetsnavigation-primary';
  nav.setAttribute('aria-label', 'Assets navigation');

  primaryNavItems.forEach((item) => {
    const button = createButton('assetsnavigation-link', item.label, {
      'data-nav-id': item.id,
      'data-view': item.view,
      'aria-current': 'false',
    });
    nav.append(button);
  });

  return nav;
}

export function createFolderNode(folder, level = 0) {
  const item = document.createElement('li');
  item.className = 'assetsnavigation-folder-item';

  const hasAuthoredChildren = Array.isArray(folder.children) && folder.children.length > 0;
  const hasChildren = hasAuthoredChildren || Boolean(folder.hasChildren);
  const button = createButton('assetsnavigation-folder-button', folder.label, {
    'data-folder-id': folder.id,
    'data-folder-href': folder.href || '',
    'data-level': level,
    'aria-current': 'false',
  });
  button.style.setProperty('--folder-level', level);

  if (hasChildren) {
    button.setAttribute('aria-expanded', 'false');
    button.classList.add('has-children');
  }

  item.append(button);

  if (hasChildren) {
    const group = document.createElement('ul');
    group.className = 'assetsnavigation-folder-group';
    group.dataset.loaded = hasAuthoredChildren ? 'true' : 'false';
    group.hidden = true;
    if (hasAuthoredChildren) {
      folder.children.forEach((child) => group.append(createFolderNode(child, level + 1)));
    }
    item.append(group);
  }

  return item;
}

function createFolders(folders = []) {
  const section = document.createElement('section');
  section.className = 'assetsnavigation-folders';
  section.setAttribute('aria-labelledby', 'assetsnavigation-folders-toggle');

  const toggle = createButton('assetsnavigation-folders-toggle', 'Carpetas', {
    id: 'assetsnavigation-folders-toggle',
    'aria-expanded': 'false',
    'aria-controls': 'assetsnavigation-folder-tree',
  });

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
  const button = createButton('assetsnavigation-login', 'Login');
  button.addEventListener('click', () => {
    window.location.assign(AUTH_STATUS_PATH);
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
