/*
 * Selection bar: the third top bar, shown between the actions bar and the
 * options bar only while selection mode is active. On the left it summarises the
 * current selection (a deselect-all control, the count and the total size); on
 * the right it offers the bulk actions (download, edit) and a close control.
 *
 * This builder only lays out the static markup and tags controls with
 * `data-action`; the live counts, labels and disabled states are driven by the
 * selection controller (`../selection.js`) via the class hooks below.
 */

import { el, createButton } from './dom.js';

/**
 * Builds the (initially hidden) selection bar.
 * @returns {HTMLDivElement}
 */
export default function createSelectionBar() {
  const bar = el('div', 'assetslisting-selectionbar');
  bar.hidden = true;

  const left = el('div', 'assetslisting-selection-left');
  left.setAttribute('aria-live', 'polite');

  const clear = createButton('assetslisting-selection-clear', '−', {
    'data-action': 'selection-clear',
    'aria-label': 'Deseleccionar todo',
    title: 'Deseleccionar todo',
  });
  const count = el('span', 'assetslisting-selection-count', '0 seleccionados');
  const size = el('span', 'assetslisting-selection-size', '0.0 MB en total');
  left.append(clear, count, size);

  const right = el('div', 'assetslisting-selection-right');

  const download = createButton('btn btn-primary assetslisting-selection-download', 'Descargar (0)', {
    'data-action': 'selection-download',
  });
  download.disabled = true;

  const edit = createButton('btn btn-secondary assetslisting-selection-edit', 'Editar', {
    'data-action': 'selection-edit',
  });
  edit.disabled = true;

  const close = createButton('assetslisting-selection-close', '✕', {
    'data-action': 'selection-close',
    'aria-label': 'Cerrar selección',
    title: 'Cerrar selección',
  });

  right.append(download, edit, close);

  bar.append(left, right);
  return bar;
}
