# assetslisting

The main workspace of the Assets Hub: lists the folders and assets of the DAM
path addressed by the route, with a filters panel, an upload flow and a detail
panel. It is a self-contained mini app that re-renders on route changes without
a page reload.

## How it fits in the SPA

`scripts/router.js` keeps the whole navigation state in the URL hash
(`#/assets-listing?path=/content/dam/...`). `scripts/hub.js` loads the fragment
for the active view into `<main>`; this block lives inside the
`assets-listing` fragment. The block reads `getRoute()` on init and subscribes
to route changes, so navigating folders only swaps its own content. View ids
are declared once in `scripts/hub-views.js`.

## Module map

| File | Responsibility |
|------|----------------|
| `assetslisting.js` | Controller: reacts to route changes, mounts the shell, fetches the listing, opens the detail panel |
| `events.js` | One delegated click/keydown handler for every control (folder/asset cards, breadcrumb, upload, toggles) |
| `data.js` | View-specific derivations (folder title, breadcrumb trail); re-exports the shared assets-api client |
| `state.js` | Persisted UI state (filters open, grid/list mode) in localStorage |
| `selection.js` | Ephemeral multi-selection controller: selection mode + picked paths, drives the selection bar and card checkboxes (never persisted, reset per folder) |
| `sections/` | DOM builders, one file per region: `shell` → `actionsbar` + `selectionbar` + `optionsbar` + `filters` + `content` (`cards`) |
| `sections/dom.js` | Shared `el` / `createButton` helpers for the builders |
| `sections/detail/` | Detail panel: `index.js` (controller), `panel.js` (static shell), `tabs.js` (tab registry + builders), `metadata-config.js` (which metadata keys to surface) |
| `sections/upload/` | Upload modal: `upload.js` (modal + flow), `upload-api.js` (permission check + multipart POST), `upload-dnd.js` (drop/picker → file list) |
| `shared/` | Builders reused by cards and detail panel (`preview.js`, `keywords.js`) |
| `styles/` | Per-region CSS, imported from `assetslisting.css` |

## Search and filters

Typing in the search box or activating any filter puts the listing in **search
mode**: folders disappear, only matching assets render, and the count shows the
server total (`N resultados`). Clearing the term and every filter returns to
the plain listing. The search state lives in the block controller (not in the
route), so it survives folder navigation — moving to another folder re-runs the
search there.

- Filter definitions come from `/bin/assetshub/settings/search-filters` —
  published "Search Filter" Content Fragments (label, property, type, order,
  options), so the panel is authorable without a deployment. Supported types:
  `singleLineText`, `checkBoxes`, `radioButtons`, `toggle`, `choiceChips`,
  `dateRange`. `sections/filters.js` renders one collapsible per filter and
  `readFilters()` turns the panel DOM back into the `{ property: value }` wire
  shape.
- The query runs server-side per context, always with the user's session:
  - **Folder**: `/bin/assetshub/assets/search?path=<folder>&q=…&filters=…`
    (subtree query; the hub settings subtree is excluded).
  - **Static collection**: `/bin/assetshub/bridge/collections/items?id=…&q=…&filters=…`
    — an OR-group of the member paths (folders contribute their subtree),
    capped at 100 members server-side.
  - **Smart collection**: same endpoint — the saved `dam:query` keeps defining
    the scope and the refinements are AND-ed onto it.
- Known limits: `singleLineText` matches are case-sensitive substrings
  (`jcr:like`); the search state is not shareable via URL (by design, for now);
  static-collection search only covers the first 100 members.

## Conventions

- Rendering and interaction are separated: builders set `data-action` /
  `data-href` / `data-asset-path` attributes; `events.js` (or the detail
  controller) reacts to them via event delegation, so re-rendered markup never
  needs rebinding.
- All data comes from the `/bin/assetshub/*` servlets through
  `scripts/assets-api.js`, on the caller's own session (results are
  ACL-scoped server-side).
- User-visible strings are Spanish; code and comments are English.

## Common changes

- **Surface a new metadata field in the detail panel**: add an entry to
  `sections/detail/metadata-config.js` — no backend change needed.
- **Add a detail tab**: add an entry (id, label, builder) to the `TABS`
  registry in `sections/detail/tabs.js`.
- **Add a toolbar control**: build it in the relevant `sections/*.js` with a
  `data-action`, handle that action in `events.js`.
