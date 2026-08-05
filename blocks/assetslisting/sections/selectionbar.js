/*
 * Selection bar: the third top bar, shown between the actions bar and the
 * options bar only while selection mode is active. On the left it summarises the
 * current selection (a deselect-all control, the count and the total size); on
 * the right it offers the bulk actions (download, edit) and a close control.
 *
 * This builder only lays out the static markup and tags controls with
 * `data-action`; the live counts, labels, checkbox state and disabled states
 * are driven by the selection controller (`../selection.js`) via the class
 * hooks below.
 */

import { el, createButton, createIconButton } from './dom.js';
import { ICON_DOWNLOAD, ICON_EDIT, ICON_CLOSE } from '../shared/icons.js';

/**
 * Builds the (initially hidden) selection bar.
 * @returns {HTMLDivElement}
 */
export default function createSelectionBar() {
  const bar = el('div', 'assetslisting-selectionbar');
  bar.hidden = true;

  const left = el('div', 'assetslisting-selection-left');
  left.setAttribute('aria-live', 'polite');

  // Tri-state select-all checkbox. It only ever shows while something is picked,
  // so it reads as a dash (partial) or a check (all); the controller keeps its
  // aria-checked in sync and CSS draws the glyph. Clicking picks every asset, or
  // clears the selection — leaving selection mode — when all are already picked.
  const checkbox = createButton('assetslisting-selection-checkbox', '', {
    'data-action': 'selection-toggle-all',
    role: 'checkbox',
    'aria-checked': 'mixed',
    'aria-label': 'Seleccionar todos los assets',
  });
  const count = el('span', 'assetslisting-selection-count', '0 seleccionados');
  const size = el('span', 'assetslisting-selection-size', '0.0 MB en total');

  // Spelled-out mirror of the checkbox's tri-state toggle: "Seleccionar los N"
  // when a pick is missing, "Deseleccionar todo" once all are picked. The
  // controller fills the label and hides it only when there is nothing to select
  // (see selection.js).
  const selectAll = createButton('assetslisting-selection-selectall', 'Seleccionar todo', {
    'data-action': 'selection-toggle-all',
  });
  selectAll.hidden = true;

  left.append(checkbox, count, size, selectAll);

  const right = el('div', 'assetslisting-selection-right');

  const download = createIconButton('btn btn-primary assetslisting-selection-download', 'Descargar (0)', ICON_DOWNLOAD, {
    'data-action': 'selection-download',
  });
  download.disabled = true;

  const edit = createIconButton('btn btn-secondary assetslisting-selection-edit', 'Editar', ICON_EDIT, {
    'data-action': 'selection-edit',
  });
  edit.disabled = true;

  const close = createButton('assetslisting-selection-close', '', {
    'data-action': 'selection-close',
    'aria-label': 'Cerrar selección',
    title: 'Cerrar selección',
  });
  close.innerHTML = ICON_CLOSE;

  right.append(download, edit, close);

  bar.append(left, right);
  return bar;
}
