/*
 * Actions bar: the current-folder title, its breadcrumb trail and the primary
 * actions (upload / select).
 */

import {
  folderTitle, breadcrumbTrail, PRODUCT_LABEL, DAM_ROOT,
} from '../data.js';
import { el, createButton, createIconButton } from './dom.js';
import { ICON_UPLOAD, ICON_SELECT } from '../shared/icons.js';

function createBreadcrumb(path) {
  const nav = document.createElement('nav');
  nav.className = 'assetslisting-breadcrumb';
  nav.setAttribute('aria-label', 'Ruta de carpetas');

  const list = document.createElement('ol');
  list.className = 'assetslisting-breadcrumb-list';

  breadcrumbTrail(path).forEach((crumb) => {
    const item = document.createElement('li');
    item.className = 'assetslisting-breadcrumb-item';

    if (crumb.current || !crumb.route) {
      const current = el('span', 'assetslisting-breadcrumb-current', crumb.label);
      current.setAttribute('aria-current', 'location');
      item.append(current);
    } else {
      // The full target route rides on the crumb as JSON so the delegated click
      // handler can navigate straight to it.
      const link = createButton('assetslisting-breadcrumb-link', crumb.label, {
        'data-route': JSON.stringify(crumb.route),
      });
      // The "Todos" (home) crumb leads with the house glyph and links back to
      // "Todos los assets" — the same target as the left-nav entry.
      if (crumb.home) {
        const icon = el('span', 'ah-icon ah-icon-breadcrumb-home assetslisting-breadcrumb-home-icon');
        icon.setAttribute('aria-hidden', 'true');
        link.prepend(icon);
      }
      item.append(link);
    }

    list.append(item);
  });

  nav.append(list);
  return nav;
}

/**
 * Builds the actions bar for a DAM path, or for an open collection.
 * @param {string} path Current DAM path (may be empty at a collection root)
 * @param {{ id: string, label: string }|null} [collection] active collection context
 * @returns {HTMLDivElement}
 */
export default function createActionsBar(path, collection = null) {
  const bar = document.createElement('div');
  bar.className = 'assetslisting-actionsbar ah-actionsbar';

  const heading = document.createElement('div');
  heading.className = 'assetslisting-heading ah-actionsbar-heading';

  const title = el('h1', 'assetslisting-title ah-actionsbar-title', folderTitle(path, collection));
  heading.append(title);

  // Second line under the title, by context:
  //  - collection: a plain "{n} Assets" counter (filled once data loads, see
  //    renderCount in assetslisting.js) — collections carry no folder breadcrumb.
  //  - DAM root: the product label ("Digital Asset Management").
  //  - DAM sub-folder: the "Todos › …" breadcrumb trail.
  if (collection) {
    heading.append(el('p', 'assetslisting-asset-count'));
  } else if (!path || path === DAM_ROOT) {
    heading.append(el('p', 'assetslisting-product', PRODUCT_LABEL));
  } else {
    heading.append(createBreadcrumb(path));
  }

  const actions = document.createElement('div');
  actions.className = 'assetslisting-actions';
  // Uploading targets a DAM folder; a collection is a virtual playlist, so the
  // upload action is hidden while browsing one.
  if (!collection) {
    actions.append(
      createIconButton('btn btn-primary', 'Subir assets', ICON_UPLOAD, {
        'data-action': 'upload',
      }),
    );
  }
  actions.append(
    createIconButton('btn btn-secondary', 'Seleccionar', ICON_SELECT, {
      'data-action': 'select',
    }),
  );

  bar.append(heading, actions);
  return bar;
}
