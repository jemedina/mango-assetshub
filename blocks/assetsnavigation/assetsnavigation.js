/*
 * Entry point for the assetsnavigation block — the app's left sidebar. It owns
 * the primary nav (views), the collapsible DAM folder tree and the user footer
 * (profile or login). Rendering lives in render.js, interaction wiring in
 * events.js, API access in data.js and the persisted tree expansion in state.js.
 */

import bindAssetsNavigation, { revealTree, highlightRoute } from './events.js';
import { ASSETS_LISTING_VIEW } from '../../scripts/hub-views.js';
import { fetchAuthStatus, userDisplay, fetchCollectionsNav } from './data.js';
import renderAssetsNavigation, {
  renderUser,
  renderUserLoading,
  renderUserLogin,
  renderCollectionsList,
} from './render.js';
import { getRoute } from '../../scripts/router.js';

async function loadFolders(block) {
  const { view, path } = getRoute();
  const activePath = view === ASSETS_LISTING_VIEW ? path : '';
  await revealTree(block, activePath);
  highlightRoute(block, getRoute());
}

async function loadCollections(block) {
  const list = block.querySelector('.assetsnavigation-collection-list');
  if (!list) return;
  try {
    const collections = await fetchCollectionsNav();
    renderCollectionsList(list, collections);
    highlightRoute(block, getRoute());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    renderCollectionsList(list, []);
  }
}

async function loadUser(block) {
  const footer = block.querySelector('.assetsnavigation-user');
  if (!footer) return;

  renderUserLoading(footer);

  try {
    const status = await fetchAuthStatus();
    renderUser(footer, userDisplay(status));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    renderUserLogin(footer);
  }
}

/**
 * Reads the authored header content. The block is authored in the `/leftnav`
 * fragment with two fields — logo (reference) and label (plain text) — so the
 * rows arrive in that order. Both are optional: an author may fill only one,
 * or neither while the page is being set up.
 * @param {Element} block The assetsnavigation block element
 * @returns {{ logo: Element|null, label: string }}
 */
function readBranding(block) {
  const [logoRow, labelRow] = block.children;
  return {
    logo: logoRow ? logoRow.querySelector('picture, img') : null,
    label: labelRow ? labelRow.textContent.trim() : '',
  };
}

/**
 * Loads and decorates the assetsnavigation block.
 * @param {Element} block The assetsnavigation block element
 */
export default async function decorate(block) {
  block.replaceChildren(...renderAssetsNavigation(readBranding(block)));
  bindAssetsNavigation(block);
  await Promise.all([loadFolders(block), loadCollections(block), loadUser(block)]);
}
