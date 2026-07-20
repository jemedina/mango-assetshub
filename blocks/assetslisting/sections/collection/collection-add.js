/*
 * "Add to collection" modal for the assets listing detail panel. Opened from the
 * detail panel's "Añadir a colección" action for the currently open asset.
 *
 * It lists the collections the current user can see (public + the private ones
 * shared with them, straight from the bridge), with a client-side search box to
 * filter by title. Picking one POSTs to the add bridge, which forwards to author
 * where the write happens only if the user may modify that collection. All markup
 * is scoped under `.assetslisting-addcol`.
 */

import { el, createButton } from '../dom.js';
import { fetchCollections, addAssetToCollection } from '../../../../scripts/collections-api.js';

const ERROR_MESSAGES = {
  unauthenticated: 'Inicia sesión para añadir a una colección.',
  forbidden: 'No tienes permiso para modificar esta colección.',
  invalid: 'Datos no válidos.',
  network: 'No se pudo completar (error de red).',
  error: 'No se pudo añadir el asset.',
};

/**
 * Opens the add-to-collection modal for one asset.
 * @param {Element} block the assetslisting block (the dialog is appended here)
 * @param {{ path: string, name?: string, title?: string }} asset the open asset
 */
export default function openAddToCollectionModal(block, asset) {
  if (!asset || !asset.path) return;

  const dialog = el('dialog', 'assetslisting-addcol');
  dialog.setAttribute('aria-label', 'Añadir a colección');

  const header = el('div', 'assetslisting-addcol-header');
  header.append(
    el('h2', 'assetslisting-addcol-title', 'Añadir a colección'),
    createButton('assetslisting-addcol-close', '✕', { 'aria-label': 'Cerrar' }),
  );

  const body = el('div', 'assetslisting-addcol-body');
  dialog.append(header, body);
  block.append(dialog);

  function close() {
    dialog.close();
    dialog.remove();
  }
  header.querySelector('.assetslisting-addcol-close').addEventListener('click', close);
  dialog.addEventListener('cancel', () => dialog.remove());

  function renderStatus(message, modifier = '') {
    body.replaceChildren(
      el('p', `assetslisting-addcol-status${modifier ? ` ${modifier}` : ''}`, message),
    );
  }

  // --- the picker (search + list) -----------------------------------------

  let allCollections = [];

  function pickCollection(collection, row) {
    row.disabled = true;
    const original = row.querySelector('.assetslisting-addcol-name').textContent;
    row.querySelector('.assetslisting-addcol-name').textContent = 'Añadiendo…';

    addAssetToCollection(collection.id, asset.path).then((result) => {
      if (!dialog.isConnected) return;
      if (result.ok) {
        const label = collection.title || 'la colección';
        renderStatus(
          result.alreadyMember
            ? `El asset ya estaba en "${label}".`
            : `Añadido a "${label}".`,
          'is-success',
        );
      } else {
        row.disabled = false;
        row.querySelector('.assetslisting-addcol-name').textContent = original;
        renderStatus(
          result.message || ERROR_MESSAGES[result.reason] || ERROR_MESSAGES.error,
          'is-error',
        );
      }
    });
  }

  function collectionRow(collection) {
    const row = createButton('assetslisting-addcol-item', '');
    row.dataset.title = (collection.title || collection.id).toLowerCase();

    const name = el('span', 'assetslisting-addcol-name', collection.title || collection.id);
    row.append(name);
    if (!collection.public) {
      row.append(el('span', 'assetslisting-addcol-badge', 'Privada'));
    }
    row.addEventListener('click', () => pickCollection(collection, row));
    return row;
  }

  function renderList(list, term) {
    const query = term.trim().toLowerCase();
    const matches = query
      ? allCollections.filter((c) => (c.title || c.id).toLowerCase().includes(query))
      : allCollections;

    list.replaceChildren();
    if (!matches.length) {
      list.append(el('p', 'assetslisting-addcol-empty', 'Sin colecciones que coincidan.'));
      return;
    }
    matches.forEach((collection) => list.append(collectionRow(collection)));
  }

  function renderPicker() {
    const wrap = el('div', 'assetslisting-addcol-picker');

    const assetName = asset.title || asset.name || asset.path.split('/').pop();
    wrap.append(el('p', 'assetslisting-addcol-lead', `Elige una colección para "${assetName}".`));

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'assetslisting-addcol-search';
    search.placeholder = 'Buscar colección…';
    search.setAttribute('aria-label', 'Buscar colección');

    const list = el('div', 'assetslisting-addcol-list');
    search.addEventListener('input', () => renderList(list, search.value));

    wrap.append(search, list);
    body.replaceChildren(wrap);
    renderList(list, '');
    search.focus();
  }

  // --- load ---------------------------------------------------------------

  renderStatus('Cargando colecciones…');
  fetchCollections()
    .then((data) => {
      if (!dialog.isConnected) return;
      allCollections = data.collections || [];
      if (!allCollections.length) {
        renderStatus('No hay colecciones disponibles para ti.');
        return;
      }
      renderPicker();
    })
    .catch(() => {
      if (!dialog.isConnected) return;
      renderStatus('No se pudieron cargar las colecciones.', 'is-error');
    });

  if (typeof dialog.showModal === 'function') dialog.showModal();
}
