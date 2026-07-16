/*
 * Actions bar: the current-folder title, its breadcrumb trail and the primary
 * actions (upload / select).
 */

import { folderTitle, breadcrumbTrail } from '../data.js';
import createButton from './dom.js';

function createBreadcrumb(path) {
  const nav = document.createElement('nav');
  nav.className = 'assetslisting-breadcrumb';
  nav.setAttribute('aria-label', 'Ruta de carpetas');

  const list = document.createElement('ol');
  list.className = 'assetslisting-breadcrumb-list';

  breadcrumbTrail(path).forEach((crumb) => {
    const item = document.createElement('li');
    item.className = 'assetslisting-breadcrumb-item';

    if (crumb.current) {
      const current = document.createElement('span');
      current.className = 'assetslisting-breadcrumb-current';
      current.setAttribute('aria-current', 'location');
      current.textContent = crumb.label;
      item.append(current);
    } else {
      const link = createButton('assetslisting-breadcrumb-link', crumb.label, {
        'data-href': crumb.path,
      });
      item.append(link);
    }

    list.append(item);
  });

  nav.append(list);
  return nav;
}

/**
 * Builds the actions bar for a DAM path.
 * @param {string} path Current DAM path
 * @returns {HTMLDivElement}
 */
export default function createActionsBar(path) {
  const bar = document.createElement('div');
  bar.className = 'assetslisting-actionsbar';

  const heading = document.createElement('div');
  heading.className = 'assetslisting-heading';

  const title = document.createElement('h1');
  title.className = 'assetslisting-title';
  title.textContent = folderTitle(path);

  heading.append(title, createBreadcrumb(path));

  const actions = document.createElement('div');
  actions.className = 'assetslisting-actions';
  actions.append(
    createButton('btn btn-primary', 'Subir assets', {
      'data-action': 'upload',
    }),
    createButton('btn btn-secondary', 'Seleccionar', {
      'data-action': 'select',
    }),
  );

  bar.append(heading, actions);
  return bar;
}
