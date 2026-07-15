import bindAssetsNavigation, { revealTree, highlightRoute, ASSETS_LISTING_VIEW } from './events.js';
import { fetchAuthStatus } from './data.js';
import renderAssetsNavigation, {
  renderUser,
  renderUserLoading,
  renderUserLogin,
} from './render.js';
import { getRoute } from '../../scripts/router.js';

async function loadFolders(block) {
  const { view, path } = getRoute();
  const activePath = view === ASSETS_LISTING_VIEW ? path : '';
  await revealTree(block, activePath);
  highlightRoute(block, getRoute());
}

async function loadUser(block) {
  const footer = block.querySelector('.assetsnavigation-user');
  if (!footer) return;

  renderUserLoading(footer);

  try {
    const status = await fetchAuthStatus();

    let userName = status.userId;
    if (status.profile.givenName) {
      userName = `${status.profile.givenName} ${(status.profile.familyName || '')}`;
    }

    renderUser(footer, userName);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    renderUserLogin(footer);
  }
}

/**
 * Loads and decorates the assetsnavigation block.
 * @param {Element} block The assetsnavigation block element
 */
export default async function decorate(block) {
  block.replaceChildren(...renderAssetsNavigation());
  bindAssetsNavigation(block);
  await Promise.all([loadFolders(block), loadUser(block)]);
}
