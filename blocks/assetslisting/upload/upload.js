/*
 * Upload modal for the assets listing — a self-contained mini-flow:
 *   1. On open, check the user's create permission on the target folder; only
 *      then is the drop zone enabled.
 *   2. Collect files and folders via drag-and-drop or the file/folder pickers,
 *      capped at MAX_FILES.
 *   3. POST the batch to the upload bridge and report per-file results, then
 *      refresh the listing so new assets appear.
 */

import { navigate } from '../../../scripts/router.js';
import { folderTitle } from '../data.js';
import {
  MAX_FILES,
  checkCreatePermission,
  uploadAssets,
} from './upload-api.js';
import { itemsFromDrop, itemsFromInput } from './upload-dnd.js';

const ASSETS_LISTING_VIEW = 'assets-listing';

const PERMISSION_MESSAGES = {
  unauthenticated: 'Inicia sesión para poder subir assets.',
  'unknown-user': 'Tu usuario aún no está aprovisionado en Author, no puedes subir todavía.',
  forbidden: 'No tienes permiso para crear assets en esta carpeta.',
  network: 'No se pudo verificar permisos (error de red).',
  error: 'No se pudieron verificar los permisos.',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(className, label, attributes = {}) {
  const node = el('button', className, label);
  node.type = 'button';
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

/**
 * Opens the upload modal for a target DAM folder.
 * @param {Element} block the assetslisting block (modal is appended here; the
 *   native <dialog> still renders in the top layer)
 * @param {string} path target DAM folder path
 */
export default function openUploadModal(block, path) {
  const items = [];
  let uploading = false;

  const dialog = el('dialog', 'assetslisting-upload');
  dialog.setAttribute('aria-label', 'Subir assets');

  const header = el('div', 'assetslisting-upload-header');
  header.append(
    el('h2', 'assetslisting-upload-title', `Subir a ${folderTitle(path)}`),
    button('assetslisting-upload-close', '✕', { 'aria-label': 'Cerrar' }),
  );

  const body = el('div', 'assetslisting-upload-body');
  const footer = el('div', 'assetslisting-upload-footer');
  const cancelBtn = button('assetslisting-button assetslisting-button-secondary', 'Cancelar');
  const submitBtn = button('assetslisting-button assetslisting-button-primary', 'Subir', { disabled: '' });
  footer.append(cancelBtn, submitBtn);

  dialog.append(header, body, footer);
  block.append(dialog);

  function close() {
    if (uploading) return;
    dialog.close();
    dialog.remove();
  }

  // --- submit ------------------------------------------------------------

  async function submit(status, refreshList) {
    if (uploading || !items.length || items.length > MAX_FILES) return;
    uploading = true;
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Subiendo...';

    try {
      const { status: httpStatus, body: result } = await uploadAssets(path, items, (fraction) => {
        status.textContent = `Subiendo... ${Math.round(fraction * 100)}%`;
      });

      const succeeded = (result && result.succeeded) || 0;
      const failed = (result && result.failed) || 0;

      if (httpStatus === 401) {
        status.classList.add('is-error');
        status.textContent = 'Sesión no autenticada.';
      } else if (httpStatus === 403) {
        status.classList.add('is-error');
        status.textContent = 'No tienes permiso para subir a esta carpeta.';
      } else if (failed === 0 && succeeded > 0) {
        status.textContent = `${succeeded} archivo${succeeded === 1 ? '' : 's'} subido${succeeded === 1 ? '' : 's'}.`;
        // Refresh the listing to reveal the new assets, then close.
        navigate({ view: ASSETS_LISTING_VIEW, path });
        window.setTimeout(() => { uploading = false; close(); }, 800);
        return;
      } else {
        status.classList.add('is-error');
        status.textContent = `${succeeded} subido(s), ${failed} con error.`;
      }
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = 'La subida falló.';
    }

    uploading = false;
    cancelBtn.disabled = false;
    if (refreshList) refreshList();
  }

  // --- ready state (dropzone + file list) --------------------------------

  function renderReady() {
    body.replaceChildren();

    const dropzone = el('div', 'assetslisting-upload-dropzone');
    dropzone.setAttribute('tabindex', '0');
    dropzone.append(
      el('p', 'assetslisting-upload-dropzone-text', 'Arrastra archivos o carpetas aquí'),
      el('p', 'assetslisting-upload-dropzone-hint', 'o selecciona desde tu equipo'),
    );

    const pickers = el('div', 'assetslisting-upload-pickers');
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.hidden = true;
    const folderInput = el('input');
    folderInput.type = 'file';
    folderInput.multiple = true;
    folderInput.hidden = true;
    folderInput.webkitdirectory = true;
    const pickFiles = button('assetslisting-button assetslisting-button-ghost', 'Seleccionar archivos');
    const pickFolder = button('assetslisting-button assetslisting-button-ghost', 'Seleccionar carpeta');
    pickers.append(pickFiles, pickFolder, fileInput, folderInput);

    const list = el('ul', 'assetslisting-upload-list');
    const status = el('p', 'assetslisting-upload-status');

    dropzone.append(pickers);
    body.append(dropzone, list, status);

    function refreshList() {
      list.replaceChildren();
      items.forEach((item, index) => {
        const row = el('li', 'assetslisting-upload-item');
        row.append(el('span', 'assetslisting-upload-item-name', item.relativePath));
        const remove = button('assetslisting-upload-item-remove', '✕', { 'aria-label': `Quitar ${item.relativePath}` });
        remove.addEventListener('click', () => {
          items.splice(index, 1);
          refreshList();
        });
        row.append(remove);
        list.append(row);
      });

      const over = items.length > MAX_FILES;
      status.classList.toggle('is-error', over);
      if (over) {
        status.textContent = `Demasiados archivos: ${items.length}. El máximo es ${MAX_FILES}.`;
      } else {
        status.textContent = items.length
          ? `${items.length} archivo${items.length === 1 ? '' : 's'} listo${items.length === 1 ? '' : 's'} para subir`
          : '';
      }
      submitBtn.textContent = items.length ? `Subir (${items.length})` : 'Subir';
      submitBtn.disabled = uploading || items.length === 0 || over;
    }

    function addItems(newItems) {
      const seen = new Set(items.map((item) => item.relativePath));
      newItems.forEach((item) => {
        if (!seen.has(item.relativePath)) {
          seen.add(item.relativePath);
          items.push(item);
        }
      });
      refreshList();
    }

    // drag & drop
    ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    }));
    ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      if (type === 'dragleave' && dropzone.contains(event.relatedTarget)) return;
      dropzone.classList.remove('is-dragover');
    }));
    dropzone.addEventListener('drop', async (event) => {
      const dropped = await itemsFromDrop(event.dataTransfer);
      addItems(dropped);
    });

    // pickers
    pickFiles.addEventListener('click', () => fileInput.click());
    pickFolder.addEventListener('click', () => folderInput.click());
    fileInput.addEventListener('change', () => {
      addItems(itemsFromInput(fileInput.files));
      fileInput.value = '';
    });
    folderInput.addEventListener('change', () => {
      addItems(itemsFromInput(folderInput.files));
      folderInput.value = '';
    });

    submitBtn.onclick = () => submit(status, refreshList);
    refreshList();
  }

  // --- wiring ------------------------------------------------------------

  header.querySelector('.assetslisting-upload-close').addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    // Native ESC — block while uploading.
    if (uploading) event.preventDefault();
    else dialog.remove();
  });

  // Permission gate: check before enabling the drop zone.
  body.append(el('p', 'assetslisting-upload-status', 'Verificando permisos...'));
  dialog.showModal();

  checkCreatePermission(path).then((decision) => {
    if (!dialog.isConnected) return;
    if (decision.allowed) {
      renderReady();
    } else {
      const message = PERMISSION_MESSAGES[decision.reason] || PERMISSION_MESSAGES.error;
      body.replaceChildren(el('p', 'assetslisting-upload-status is-error', message));
      submitBtn.hidden = true;
    }
  });
}
