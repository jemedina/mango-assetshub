/*
 * Hub controller — turns the page into a single-page app driven by the router.
 *
 * Responsibilities:
 *  - Map a route `view` to a fragment under /hub-fragments/<view>.
 *  - Load that fragment into <main> ONLY when the view changes (a path/filter
 *    change within the same view must not reload the fragment).
 *  - Broadcast route context so the block inside each fragment can react. The
 *    contract for those blocks is: read getRoute() on init, then listen for the
 *    `hub:routechange` event (or subscribeRoute) for updates.
 */

import {
  navigate,
  subscribeRoute,
  startRouter,
} from './router.js';
import { DEFAULT_VIEW, HUB_VIEWS } from './hub-views.js';
// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../blocks/fragment/fragment.js';

export const HUB_ROUTE_EVENT = 'hub:routechange';

let mountEl;
let currentView;

function createState(message) {
  const state = document.createElement('div');
  state.className = 'hub-view-state';
  state.textContent = message;
  return state;
}

async function renderView(route) {
  const config = HUB_VIEWS[route.view];

  // Unknown or empty view -> normalize to the default (shareable cold-load).
  if (!config) {
    navigate({ view: DEFAULT_VIEW }, { replace: true });
    return;
  }

  if (route.view !== currentView) {
    currentView = route.view;
    mountEl.dataset.view = route.view;
    mountEl.replaceChildren(createState('Cargando...'));

    const fragment = await loadFragment(config.fragment);

    // Guard against a race: the view may have changed while the fragment loaded.
    if (currentView !== route.view) return;

    if (fragment) {
      mountEl.replaceChildren(...fragment.childNodes);
    } else {
      mountEl.replaceChildren(createState('Vista no disponible'));
    }
  }

  // Publish the current context (view + path + filters) for the loaded block.
  mountEl.dataset.path = route.path || '';
  document.dispatchEvent(new CustomEvent(HUB_ROUTE_EVENT, { detail: route }));
}

/**
 * Initializes the hub: takes over <main> with a view mount point, wires the
 * router and loads the initial view.
 * @param {Element} main The page main element
 */
export function initHub(main) {
  mountEl = document.createElement('div');
  mountEl.className = 'hub-view';
  mountEl.setAttribute('aria-live', 'polite');
  main.replaceChildren(mountEl);

  subscribeRoute(renderView);
  startRouter();
}
