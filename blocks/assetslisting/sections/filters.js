/*
 * Filters panel — the second left nav. Placeholder content for now; the layout
 * (open/closed, overlay on small screens) is driven from CSS via the block's
 * data-filters-open attribute.
 */

/**
 * Builds the filters panel.
 * @returns {HTMLElement}
 */
export default function createFiltersPanel() {
  const panel = document.createElement('aside');
  panel.className = 'assetslisting-filters-panel';
  panel.id = 'assetslisting-filters-panel';
  panel.setAttribute('aria-label', 'Filtros');
  panel.innerHTML = `
    <div class="assetslisting-filters-header">
      <p class="assetslisting-filters-title">Filtros</p>
    </div>
    <div class="assetslisting-filters-placeholder">filters tbd</div>
  `;
  return panel;
}
