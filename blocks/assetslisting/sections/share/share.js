/*
 * Share modal for the assets listing — opened when a multi-asset selection is
 * shared instead of downloaded. It generates an OOTB anonymous link share for
 * the selected paths and presents the resulting URL with a copy control.
 *
 * The flow is intentionally thin: open in a "generating…" state, call the share
 * client, then render either the link or a reason-specific error. All markup is
 * scoped under `.assetslisting-share`.
 */

import { formatDate } from '../../../../scripts/assets-api.js';
import { el, createButton } from '../dom.js';
import { createShareLink } from './share-api.js';

const ERROR_MESSAGES = {
  unauthenticated: 'Inicia sesión para generar un enlace de compartir.',
  forbidden: 'No tienes permiso para compartir estos assets.',
  'no-link': 'AEM no devolvió un enlace de compartir.',
  invalid: 'Selección no válida para compartir.',
  network: 'No se pudo generar el enlace (error de red).',
  error: 'No se pudo generar el enlace.',
};

/**
 * Opens the share modal and kicks off link generation.
 * @param {Element} block the assetslisting block (modal is appended here; the
 *   native <dialog> still renders in the top layer)
 * @param {string} anchorPath current DAM folder, used as the share anchor
 * @param {string[]} paths selected asset paths to share
 */
export default function openShareModal(block, anchorPath, paths) {
  const count = paths.length;

  const dialog = el('dialog', 'assetslisting-share');
  dialog.setAttribute('aria-label', 'Compartir assets');

  const header = el('div', 'assetslisting-share-header');
  header.append(
    el('h2', 'assetslisting-share-title', `Compartir ${count} asset${count === 1 ? '' : 's'}`),
    createButton('assetslisting-share-close', '✕', { 'aria-label': 'Cerrar' }),
  );

  const body = el('div', 'assetslisting-share-body');
  body.append(el('p', 'assetslisting-share-status', 'Generando enlace…'));

  dialog.append(header, body);
  block.append(dialog);

  function close() {
    dialog.close();
    dialog.remove();
  }

  header.querySelector('.assetslisting-share-close').addEventListener('click', close);
  dialog.addEventListener('cancel', () => dialog.remove());

  function renderError(reason) {
    body.replaceChildren(
      el('p', 'assetslisting-share-status is-error', ERROR_MESSAGES[reason] || ERROR_MESSAGES.error),
    );
  }

  function renderResult(result) {
    body.replaceChildren();

    const field = el('div', 'assetslisting-share-field');
    const input = el('input', 'assetslisting-share-url');
    input.type = 'text';
    input.readOnly = true;
    input.value = result.shareUrl;
    input.setAttribute('aria-label', 'Enlace de compartir');

    const copy = createButton('btn btn-primary assetslisting-share-copy', 'Copiar');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(result.shareUrl);
        copy.textContent = 'Copiado';
      } catch (error) {
        // Clipboard API can be blocked; fall back to selecting the text.
        input.select();
        copy.textContent = 'Selecciona y copia';
      }
      window.setTimeout(() => { copy.textContent = 'Copiar'; }, 1500);
    });

    field.append(input, copy);

    const meta = el('p', 'assetslisting-share-meta');
    const expires = formatDate(result.expiresAt);
    const validity = expires ? ` · válido hasta el ${expires}` : '';
    meta.textContent = `Enlace anónimo para ${count} asset${count === 1 ? '' : 's'}${validity}`;

    body.append(
      el('p', 'assetslisting-share-status', 'Enlace listo para compartir:'),
      field,
      meta,
    );

    input.focus();
    input.select();
  }

  dialog.showModal();

  createShareLink(anchorPath, paths)
    .then((result) => {
      if (!dialog.isConnected) return;
      if (result.ok) renderResult(result);
      else renderError(result.reason);
    })
    .catch(() => {
      if (dialog.isConnected) renderError('network');
    });
}
