/*
 * Selection controller for the listing.
 *
 * Owns the ephemeral multi-selection state (which asset paths are picked and
 * whether selection mode is on). Selection is presentation-only and folder
 * scoped — it never persists (unlike the view chrome in state.js) and is reset
 * whenever the shell is rebuilt for a new folder, so navigating away clears it.
 *
 * The controller is the single writer of the selection-driven DOM: it toggles
 * the block's `data-selection-mode` flag (the CSS keys the selection bar and the
 * card checkboxes off it), keeps the selection-bar summary/labels in sync and
 * reflects each card's checked state. Callers only ask it to enter/exit/toggle;
 * they never touch the markup directly.
 */

import { formatSizeMb } from './data.js';

/**
 * @param {Element} block The assetslisting block element (query root; rebuilt on
 *   navigation, so the controller re-resolves nodes on every apply()).
 * @param {() => Array<{ path: string, size?: number }>} getAssets Current folder
 *   assets, used to sum the selected sizes.
 * @param {() => Array<{ path: string }>} [getFolders] Current subfolders, used to
 *   tell folder picks apart (a folder selection always shares, never downloads).
 * @returns {{
 *   isActive: () => boolean,
 *   enter: () => void, exit: () => void,
 *   clear: () => void, reset: () => void, refresh: () => void,
 *   toggle: (path: string) => void,
 *   selectedPaths: () => string[],
 *   hasFolderSelected: () => boolean,
 * }}
 */
export default function createSelection(block, getAssets, getFolders = () => []) {
  const selected = new Set();
  let active = false;

  const q = (selector) => block.querySelector(selector);

  function totalBytes() {
    return getAssets().reduce((sum, asset) => (
      selected.has(asset.path) && typeof asset.size === 'number' ? sum + asset.size : sum
    ), 0);
  }

  function hasFolderSelected() {
    return getFolders().some((folder) => selected.has(folder.path));
  }

  // Single writer: push the whole selection state onto the block, the selection
  // bar and the cards. Cheap enough to run wholesale on every change (assets are
  // capped per folder), which keeps the callers trivial.
  function apply() {
    block.dataset.selectionMode = String(active);

    const bar = q('.assetslisting-selectionbar');
    if (bar) bar.hidden = !active;

    const selectToggle = q('[data-action="select"]');
    if (selectToggle) selectToggle.setAttribute('aria-pressed', String(active));

    const count = selected.size;

    const countLabel = q('.assetslisting-selection-count');
    if (countLabel) countLabel.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;

    const sizeLabel = q('.assetslisting-selection-size');
    if (sizeLabel) sizeLabel.textContent = `${formatSizeMb(totalBytes()) || '0 MB'} en total`;

    // The primary bulk action morphs by content: a single asset downloads, but
    // more than one — or any folder — shares (an anonymous link is cheaper than
    // N download hits and a folder cannot download directly). The controller
    // reads the same rule.
    const download = q('.assetslisting-selection-download');
    if (download) {
      const shares = count > 1 || hasFolderSelected();
      download.textContent = shares ? `Compartir (${count})` : `Descargar (${count})`;
      download.disabled = count === 0;
    }

    const edit = q('.assetslisting-selection-edit');
    if (edit) edit.disabled = count === 0;

    block.querySelectorAll('.assetslisting-card-asset').forEach((card) => {
      const checked = active && selected.has(card.dataset.assetPath);
      if (checked) card.dataset.checked = 'true';
      else delete card.dataset.checked;
      if (active) card.setAttribute('aria-pressed', String(checked));
      else card.removeAttribute('aria-pressed');
    });

    block.querySelectorAll('.assetslisting-card-folder').forEach((card) => {
      const checked = active && selected.has(card.dataset.href);
      if (checked) card.dataset.checked = 'true';
      else delete card.dataset.checked;
    });
  }

  return {
    isActive: () => active,

    enter() {
      if (active) return;
      active = true;
      apply();
    },

    exit() {
      active = false;
      selected.clear();
      apply();
    },

    // Deselect everything but stay in selection mode (the "−" control).
    clear() {
      selected.clear();
      apply();
    },

    toggle(path) {
      if (!path) return;
      if (selected.has(path)) selected.delete(path);
      else selected.add(path);
      apply();
    },

    // Called after the shell is rebuilt for a new folder: drop all state and
    // resync the fresh (hidden) markup.
    reset() {
      active = false;
      selected.clear();
      apply();
    },

    // Re-sync the DOM without changing state, e.g. after the cards re-render for
    // the same folder.
    refresh: apply,

    selectedPaths: () => [...selected],

    hasFolderSelected,
  };
}
