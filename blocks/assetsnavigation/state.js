/*
 * Persists the set of expanded folder paths in the left nav (UI state only —
 * paths, never listing content, which is permission-sensitive and no-store).
 * Lets a refresh restore the tree the way the user left it.
 */

const STORAGE_KEY = 'assetshub:nav:expanded-folders';

export function getExpanded() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function setExpanded(paths) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...paths]));
  } catch {
    // ignore storage failures (private mode, quota, disabled storage)
  }
}

export function addExpanded(path) {
  if (!path) return;
  const paths = getExpanded();
  paths.add(path);
  setExpanded(paths);
}

export function removeExpanded(path) {
  if (!path) return;
  const paths = getExpanded();
  paths.delete(path);
  setExpanded(paths);
}
