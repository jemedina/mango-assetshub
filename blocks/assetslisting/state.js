/*
 * Persists view-chrome UI state for the listing (filters panel open/closed and
 * grid/list view mode). This is presentation state only — never listing
 * content, which is permission-sensitive — so localStorage is safe and lets a
 * refresh restore the workspace the way the user left it.
 */

const STORAGE_KEY = 'assetshub:listing:ui';

const DEFAULTS = {
  filtersOpen: false,
  viewMode: 'grid',
  sortField: 'date',
  sortDirection: 'desc',
};

export function getUiState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setUiState(patch) {
  const next = { ...getUiState(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures (private mode, quota, disabled storage)
  }
  return next;
}
