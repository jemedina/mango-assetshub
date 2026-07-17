/*
 * Share modal for the assets listing — opened when a selection (assets and/or
 * folders) is shared instead of downloaded. It requests an OOTB anonymous link
 * share created ON AUTHOR through the publish bridge and presents the resulting
 * URL with a copy control.
 *
 * The flow gates on author-account existence first: the share link's owner must
 * be a real author user for the anonymous viewer to resolve it. So the modal
 * (1) checks whether the current user exists on author; if not, it asks them to
 * provision their account there and re-check; once present, (2) it generates the
 * link. All markup is scoped under `.assetslisting-share`.
 */

import { formatDate } from '../../../../scripts/assets-api.js';
import { el, createButton } from '../dom.js';
import { requestShareLink, checkUserInAuthor } from './share-api.js';

const ERROR_MESSAGES = {
  unauthenticated: 'Inicia sesión para generar un enlace de compartir.',
  forbidden: 'No tienes permiso para compartir esta selección.',
  'no-link': 'AEM no devolvió un enlace de compartir.',
  invalid: 'Selección no válida para compartir.',
  network: 'No se pudo generar el enlace (error de red).',
  error: 'No se pudo generar el enlace.',
};

/**
 * Opens the share modal and kicks off the account check → link generation flow.
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
    el('h2', 'assetslisting-share-title', `Compartir ${count} elemento${count === 1 ? '' : 's'}`),
    createButton('assetslisting-share-close', '✕', { 'aria-label': 'Cerrar' }),
  );

  const body = el('div', 'assetslisting-share-body');

  dialog.append(header, body);
  block.append(dialog);

  function close() {
    dialog.close();
    dialog.remove();
  }

  header.querySelector('.assetslisting-share-close').addEventListener('click', close);
  dialog.addEventListener('cancel', () => dialog.remove());

  function renderStatus(message, modifier = '') {
    body.replaceChildren(
      el('p', `assetslisting-share-status${modifier ? ` ${modifier}` : ''}`, message),
    );
  }

  function renderError(reason) {
    renderStatus(ERROR_MESSAGES[reason] || ERROR_MESSAGES.error, 'is-error');
  }

  /**
   * "User not in author" state: explain, offer a jump to author (to provision
   * the account via IMS login) and a re-check that resumes the flow once present.
   */
  function renderNeedsAuthor(authorBaseUrl) {
    body.replaceChildren();

    const warning = 'Tu cuenta aún no existe en Author. Inicia sesión en Author para crearla y luego vuelve a verificar.';
    const message = el('p', 'assetslisting-share-status is-warning', warning);

    const actions = el('div', 'assetslisting-share-actions');

    if (authorBaseUrl) {
      const goToAuthor = createButton('btn btn-primary assetslisting-share-author', 'Ir a Author');
      goToAuthor.addEventListener('click', () => {
        window.open(authorBaseUrl, '_blank', 'noopener');
      });
      actions.append(goToAuthor);
    }

    const recheck = createButton('btn assetslisting-share-recheck', 'Verificar de nuevo');
    // eslint-disable-next-line no-use-before-define
    recheck.addEventListener('click', () => { runFlow(); });
    actions.append(recheck);

    body.append(message, actions);
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
    meta.textContent = `Enlace anónimo (creado en author) para ${count} elemento${count === 1 ? '' : 's'}${validity}`;

    body.append(
      el('p', 'assetslisting-share-status', 'Enlace listo para compartir:'),
      field,
      meta,
    );

    input.focus();
    input.select();
  }

  /** Generates the link and renders the result (or a reason-specific error). */
  async function generate() {
    renderStatus('Generando enlace…');
    try {
      const result = await requestShareLink(paths);
      if (!dialog.isConnected) return;
      if (result.ok) renderResult(result);
      else renderError(result.reason);
    } catch (error) {
      if (dialog.isConnected) renderError('network');
    }
  }

  /** Checks author-account existence, then either prompts for it or generates. */
  async function runFlow() {
    renderStatus('Verificando tu cuenta en Author…');
    let check;
    try {
      check = await checkUserInAuthor();
    } catch (error) {
      check = { ok: false, reason: 'network' };
    }
    if (!dialog.isConnected) return;
    if (!check.ok) { renderError(check.reason); return; }
    if (!check.exists) { renderNeedsAuthor(check.authorBaseUrl); return; }
    await generate();
  }

  dialog.showModal();
  runFlow();
}
