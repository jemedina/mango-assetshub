/*
 * Public API for the assetslisting sections. Each section builder owns one
 * region of the view (actions bar, options bar, filters, cards, content, shell);
 * this barrel re-exports the entry points the controller (assetslisting.js) uses.
 */

export { default as renderShell } from './shell.js';
export { renderContent, createState } from './content.js';
