/*
 * Actions bar: the current-folder title, its breadcrumb trail and the primary
 * actions (upload / select).
 */

import { folderTitle, breadcrumbTrail } from '../data.js';
import { createButton, createIconButton } from './dom.js';
import { ICON_UPLOAD, ICON_SELECT } from '../shared/icons.js';

function createBreadcrumb(path, collection) {
  const nav = document.createElement('nav');
  nav.className = 'assetslisting-breadcrumb';
  nav.setAttribute('aria-label', collection ? 'Ruta de colección' : 'Ruta de carpetas');

  const list = document.createElement('ol');
  list.className = 'assetslisting-breadcrumb-list';

  breadcrumbTrail(path, collection).forEach((crumb) => {
    const item = document.createElement('li');
    item.className = 'assetslisting-breadcrumb-item';

    if (crumb.current || !crumb.route) {
      const current = document.createElement('span');
      current.className = 'assetslisting-breadcrumb-current';
      current.setAttribute('aria-current', 'location');
      current.textContent = crumb.label;
      item.append(current);
    } else {
      // The full target route rides on the crumb as JSON so a collection crumb
      // can carry its filters, not just a path.
      const link = createButton('assetslisting-breadcrumb-link', crumb.label, {
        'data-route': JSON.stringify(crumb.route),
      });
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
  bar.className = 'assetslisting-actionsbar';

  const heading = document.createElement('div');
  heading.className = 'assetslisting-heading';

  const title = document.createElement('h1');
  title.className = 'assetslisting-title';
  title.textContent = folderTitle(path, collection);

  heading.append(title, createBreadcrumb(path, collection));

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
