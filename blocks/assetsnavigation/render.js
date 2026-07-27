/*
 * DOM builders for the navigation block: header, primary nav, the collapsible
 * folder tree (recursive folder nodes) and the user footer states. Pure
 * rendering — clicks are handled by the delegated listener in events.js, keyed
 * on the data-view / data-folder-href attributes set here.
 */

import { primaryNavItems, startLogin } from './data.js';

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
 * Disclosure arrow used by every expandable trigger (section toggles, folder
 * rows). One shared icon (nav-arrow.png via `.ah-icon-arrow`) rotated by CSS off
 * the container's aria-expanded — see `.ah-button-nav-chevron` in buttons.css.
 * @returns {HTMLSpanElement}
 */
function createChevron() {
  const chevron = document.createElement('span');
  chevron.className = 'ah-icon ah-icon-arrow ah-button-nav-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  return chevron;
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
    const productLabel = document.createElement('p');
    productLabel.className = 'assetsnavigation-product-label';
    productLabel.textContent = label;
    header.append(productLabel);
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
  icon.className = `ah-icon ${item.iconClass}`;
  icon.setAttribute('aria-hidden', 'true');

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
  // Depth as a custom property: rows are full-bleed (their background starts
  // at the tree's left edge) and indent through their own padding-left, which
  // the CSS derives from this value. Nested lists carry no margins.
  button.style.setProperty('--ah-folder-level', level);
  button.setAttribute('aria-current', 'false');

  const label = document.createElement('span');
  label.className = 'assetsnavigation-folder-label';
  label.textContent = folder.label;
  // Native tooltip with the full name: folder rows truncate hard in the narrow
  // sidebar, so hovering reveals what the ellipsis cut off.
  if (folder.label) label.title = folder.label;

  const icon = document.createElement('span');
  icon.className = 'ah-icon ah-icon-folder';
  icon.setAttribute('aria-hidden', 'true');

  const labelGroup = document.createElement('span');
  labelGroup.className = 'ah-button-nav-group';
  labelGroup.append(icon, label);

  // Expandable folders get a leading disclosure arrow (to the LEFT of the folder
  // icon, like a file tree); leaves get a same-width spacer so every folder icon
  // stays vertically aligned regardless of whether the row expands.
  if (hasChildren) {
    button.classList.add('has-children');
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.append(createChevron(), labelGroup);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'assetsnavigation-folder-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    button.append(spacer, labelGroup);
  }

  item.append(button);

  if (hasChildren) {
    const group = document.createElement('ul');
    group.className = 'assetsnavigation-folder-group';
    group.dataset.loaded = hasAuthoredChildren ? 'true' : 'false';
    // Children's depth, inherited by rows without one of their own (the
    // loading / empty state lis), so they line up with the folder rows.
    group.style.setProperty('--ah-folder-level', level + 1);
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
  icon.className = 'ah-icon ah-icon-folders-main';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = 'Carpetas';

  group.append(icon, label);

  button.append(group, createChevron());
  return button;
}

function createFolders(folders = []) {
  const section = document.createElement('section');
  section.className = 'assetsnavigation-folders';
  section.setAttribute('aria-labelledby', 'assetsnavigation-folders-toggle');

  const toggle = createFoldersToggle();

  // Rows fill the sidebar width and truncate their own label (see the
  // folder-button rules in CSS), so the tree never overflows sideways — no
  // horizontal scroller or scrollbar proxy is needed. The tree mounts straight
  // into the section; vertical overflow scrolls on .assetsnavigation-content.
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
  // Collapsed by default, like "Carpetas": each section only opens on its own
  // when the URL points inside it (see handleRouteChange), so landing in a
  // folder shows collections collapsed and vice versa.
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'assetsnavigation-collections-list');

  const group = document.createElement('span');
  group.className = 'ah-button-nav-group';

  const icon = document.createElement('span');
  icon.className = 'ah-icon ah-icon-collections';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = 'Colecciones';

  group.append(icon, label);

  button.append(group, createChevron());
  return button;
}

/**
 * One collection row: same shape as a folder row (icon + label). Kept at
 * `--ah-folder-level: 0` so its content lines up flush-left with the group row
 * and the "Colecciones" section toggle — every row in the section shares one
 * left edge (no per-level indentation here). Clicking opens the collection
 * (wired by the delegated handler in events.js off the data-collection-* attributes).
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
  button.style.setProperty('--ah-folder-level', 0);
  button.setAttribute('aria-current', 'false');

  const icon = document.createElement('span');
  icon.className = 'ah-icon ah-icon-lg ah-icon-collection';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'assetsnavigation-collection-label';
  label.textContent = collection.label;

  const group = document.createElement('span');
  group.className = 'ah-button-nav-group';
  group.append(icon, label);
  button.append(group);

  item.append(button);
  return item;
}

/**
 * One group node: an expandable row (leading disclosure arrow + label) whose
 * nested list holds the group's collection rows — the single extra level of the
 * two-level tree. Mirrors an expandable folder node (chevron toggles the group
 * without navigating anywhere); the collection rows inside are the leaves.
 * @param {{ label: string, collections: Array }} group
 */
export function createCollectionGroupNode(group) {
  const item = document.createElement('li');
  item.className = 'assetsnavigation-collection-group';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'assetsnavigation-collection-group-button';
  button.dataset.groupLabel = group.label;
  button.style.setProperty('--ah-folder-level', 0);
  // Collapsed by default; the group holding the open collection is expanded by
  // the route handler (mirrors how the active folder's ancestors open).
  button.setAttribute('aria-expanded', 'false');

  const label = document.createElement('span');
  label.className = 'assetsnavigation-collection-group-label';
  label.textContent = group.label;

  const labelGroup = document.createElement('span');
  labelGroup.className = 'ah-button-nav-group';
  labelGroup.append(label);

  // Label on the left, trailing disclosure arrow on the right — same layout as
  // the section headers ("Colecciones" / "Carpetas"); no item count (per business).
  button.append(labelGroup, createChevron());

  const list = document.createElement('ul');
  list.className = 'assetsnavigation-collection-group-list';
  list.style.setProperty('--ah-folder-level', 0);
  list.hidden = true;
  group.collections.forEach((collection) => list.append(createCollectionItem(collection)));

  item.append(button, list);
  return item;
}

/**
 * Paints the grouped collections tree (groups -> collections). Each group renders
 * as an expandable node; an empty result shows the shared empty state.
 * @param {Element} list the collections list container
 * @param {Array<{ label: string, collections: Array }>} groups
 */
export function renderCollectionsList(list, groups) {
  list.replaceChildren();
  if (!groups.length) {
    list.append(collectionState('No hay colecciones disponibles'));
    return;
  }
  groups.forEach((group) => list.append(createCollectionGroupNode(group)));
}

function createCollections() {
  const section = document.createElement('section');
  section.className = 'assetsnavigation-collections';
  section.setAttribute('aria-labelledby', 'assetsnavigation-collections-toggle');

  const list = document.createElement('ul');
  list.id = 'assetsnavigation-collections-list';
  list.className = 'assetsnavigation-collection-list';
  list.hidden = true;
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

export function renderUser(footer, { name, initials, photo }) {
  const avatar = document.createElement('span');
  avatar.className = 'assetsnavigation-user-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  if (photo) {
    const img = document.createElement('img');
    img.className = 'assetsnavigation-user-avatar-img';
    img.src = photo;
    img.alt = '';
    // Fall back to initials if the inlined avatar fails to decode.
    img.addEventListener('error', () => {
      avatar.textContent = initials;
    });
    avatar.append(img);
  } else {
    avatar.textContent = initials;
  }

  const details = document.createElement('div');
  details.className = 'assetsnavigation-user-details';

  const nameEl = document.createElement('p');
  nameEl.className = 'assetsnavigation-user-name';
  nameEl.textContent = name;

  details.append(nameEl);
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
