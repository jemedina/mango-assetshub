/*
 * Client-side asset sorting for the options bar sort control. The full asset
 * list for a folder is already in memory (fetched once per folder), so
 * re-sorting is just an in-place re-render — no extra request.
 */

import { displayLabel, formatLabel } from '../data.js';

export const SORT_FIELDS = [
  { field: 'name', label: 'Nombre' },
  { field: 'date', label: 'Fecha de modificación' },
  { field: 'size', label: 'Tamaño' },
  { field: 'type', label: 'Tipo' },
];

const COMPARATORS = {
  name: (a, b) => displayLabel(a).localeCompare(displayLabel(b), 'es', { sensitivity: 'base' }),
  date: (a, b) => new Date(a.uploaded || 0) - new Date(b.uploaded || 0),
  size: (a, b) => (a.size || 0) - (b.size || 0),
  type: (a, b) => formatLabel(a.format).localeCompare(formatLabel(b.format), 'es'),
};

/**
 * Returns a new array with `assets` sorted by field and direction. Folders
 * are intentionally out of scope — they stay in the order the API returns.
 * @param {Array} assets
 * @param {'name'|'date'|'size'|'type'} field
 * @param {'asc'|'desc'} direction
 * @returns {Array}
 */
export function sortAssets(assets, field, direction) {
  const compare = COMPARATORS[field] || COMPARATORS.name;
  const sign = direction === 'desc' ? -1 : 1;
  return [...assets].sort((a, b) => sign * compare(a, b));
}
