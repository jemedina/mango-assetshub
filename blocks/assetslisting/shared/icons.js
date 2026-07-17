/*
 * Inline SVG markup for the assetslisting toolbar icons (Figma: Mango DAM
 * AEM Sites). Inlined (not <img src>) so `currentColor` picks up the button
 * text color set in CSS.
 */

export const ICON_UPLOAD = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.375 8.125V10.2917C11.375 10.579 11.2609 10.8545 11.0577 11.0577C10.8545 11.2609 10.579 11.375 10.2917 11.375H2.70833C2.42102 11.375 2.14547 11.2609 1.9423 11.0577C1.73914 10.8545 1.625 10.579 1.625 10.2917V8.125" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.20829 4.33333L6.49996 1.625L3.79163 4.33333" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.5 1.625V8.125" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_SELECT = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.375 5.6875V10.2917C11.375 10.579 11.2609 10.8545 11.0577 11.0577C10.8545 11.2609 10.579 11.375 10.2917 11.375H2.70833C2.42102 11.375 2.14547 11.2609 1.9423 11.0577C1.73914 10.8545 1.625 10.579 1.625 10.2917V2.70833C1.625 2.42102 1.73914 2.14547 1.9423 1.9423C2.14547 1.73914 2.42102 1.625 2.70833 1.625H9.47917" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.875 5.95833L6.5 7.58333L11.9167 2.16667" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/*
 * Generic standard icons (sort, filter, grid/list view, search) — the Figma
 * MCP hit its API rate limit before these could be extracted 1:1, so these
 * are hand-built stand-ins using the same stroke-width/line-cap language as
 * the icons above. Swap for the exact Figma vectors once the API is free
 * again if they turn out to differ.
 */

export const ICON_SORT = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.79167 2.16667V10.8333" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.625 4.33333L3.79167 2.16667L5.95833 4.33333" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.20833 10.8333V2.16667" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.375 8.66667L9.20833 10.8333L7.04167 8.66667" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_FILTER = `<svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.625 2.16667H11.375L7.58333 6.75833V10.4167L5.41667 11.375V6.75833L1.625 2.16667Z" stroke="currentColor" stroke-width="1.08333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_VIEW_GRID = `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="1.75" y="1.75" width="4.66667" height="4.66667" rx="0.583333" stroke="currentColor" stroke-width="1.16667"/>
<rect x="7.58333" y="1.75" width="4.66667" height="4.66667" rx="0.583333" stroke="currentColor" stroke-width="1.16667"/>
<rect x="1.75" y="7.58333" width="4.66667" height="4.66667" rx="0.583333" stroke="currentColor" stroke-width="1.16667"/>
<rect x="7.58333" y="7.58333" width="4.66667" height="4.66667" rx="0.583333" stroke="currentColor" stroke-width="1.16667"/>
</svg>`;

export const ICON_VIEW_LIST = `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.75 3.5H12.25" stroke="currentColor" stroke-width="1.16667" stroke-linecap="round"/>
<path d="M1.75 7H12.25" stroke="currentColor" stroke-width="1.16667" stroke-linecap="round"/>
<path d="M1.75 10.5H12.25" stroke="currentColor" stroke-width="1.16667" stroke-linecap="round"/>
</svg>`;

export const ICON_SEARCH = `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="6.41667" cy="6.41667" r="4.66667" stroke="currentColor" stroke-width="1.16667"/>
<path d="M12.25 12.25L9.70833 9.70833" stroke="currentColor" stroke-width="1.16667" stroke-linecap="round"/>
</svg>`;

export const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" stroke-width="0.833333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
