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

// Same folder glyph as the detail panel's "Colección" field icon (Figma:
// node 1:3518) — a plain gray outline, not the yellow emoji folder cards used
// to show. Used next to a folder card's name (Figma: node 1:4336, 12x12).
export const ICON_FOLDER = `<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 10C10.2652 10 10.5196 9.89464 10.7071 9.70711C10.8946 9.51957 11 9.26522 11 9V4C11 3.73478 10.8946 3.48043 10.7071 3.29289C10.5196 3.10536 10.2652 3 10 3H6.05C5.88276 3.00164 5.71777 2.96131 5.57015 2.88269C5.42253 2.80407 5.29698 2.68969 5.205 2.55L4.8 1.95C4.70895 1.81173 4.58499 1.69824 4.43925 1.6197C4.29351 1.54116 4.13055 1.50003 3.965 1.5H2C1.73478 1.5 1.48043 1.60536 1.29289 1.79289C1.10536 1.98043 1 2.23478 1 2.5V9C1 9.26522 1.10536 9.51957 1.29289 9.70711C1.48043 9.89464 1.73478 10 2 10H10Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// The folder card's thumbnail glyph — a filled folder shape, distinct from
// the plain outline above (Figma: node 1:4331, 40x40, 40% opacity applied to
// the whole group in Figma — applied via CSS here instead). The fill (black)
// and the thick 3.33px stroke (#888888) are deliberately different colors —
// that mismatch is what reads as a soft shadow ring around the folder shape,
// so unlike other icons here it's NOT collapsed to a single currentColor.
export const ICON_FOLDER_THUMB = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M33.3333 33.3333C34.2173 33.3333 35.0652 32.9821 35.6903 32.357C36.3154 31.7319 36.6666 30.8841 36.6666 30V13.3333C36.6666 12.4493 36.3154 11.6014 35.6903 10.9763C35.0652 10.3512 34.2173 10 33.3333 10H20.1666C19.6091 10.0055 19.0592 9.87102 18.5671 9.60897C18.075 9.34691 17.6565 8.96563 17.3499 8.5L15.9999 6.5C15.6964 6.03912 15.2832 5.6608 14.7974 5.39899C14.3116 5.13719 13.7684 5.00009 13.2166 5H6.66659C5.78253 5 4.93468 5.35119 4.30956 5.97631C3.68444 6.60143 3.33325 7.44928 3.33325 8.33333V30C3.33325 30.8841 3.68444 31.7319 4.30956 32.357C4.93468 32.9821 5.78253 33.3333 6.66659 33.3333H33.3333Z" fill="black" stroke="#888888" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Empty-folder state icon: an open inbox tray.
export const ICON_INBOX = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22 12h-6l-2 3h-4l-2-3H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
