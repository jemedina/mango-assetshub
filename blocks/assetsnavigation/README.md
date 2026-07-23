# assetsnavigation

The app's left sidebar: primary navigation between SPA views, a lazy-loaded DAM
folder tree, and the user footer (profile or login).

## Where it is authored

The block lives on its own page, `/leftnav`, which every page pulls in as a
fragment (`mountLeftNav` in `scripts/scripts.js`) and mounts in the `<aside
class="leftnav">` before `<main>`. Authors edit the sidebar once, there.

The block takes two optional fields:

| Field | Component | Renders as |
|-------|-----------|-----------|
| `logo` | reference | The image at the top of the header |
| `label` | text | The line under the logo |

Each renders only when authored — there is no hardcoded wordmark or product
name standing in, so an empty header reads as unauthored instead of as a
deliberate design.

**There is no fallback.** If `/leftnav` is missing, unpublished or holds no
`assetsnavigation` block, no sidebar is mounted: the page renders full width
and `mountLeftNav` logs why. That is on purpose — a sidebar synthesized in code
would look correct while the site is misconfigured, which makes a broken deploy
indistinguishable from a working one. Do not reintroduce one.

Opening `/leftnav` itself does **not** mount the sidebar: the block would be
nested inside itself. There the authored content stays in `<main>` and the
SPA/router is off, exactly as in Universal Editor, so the page can be edited
and previewed. Keep that guard (`isLeftNavPage`) in mind when touching the
page-load sequence.

## How it fits in the SPA

Clicking a nav item or folder calls `navigate()` from `scripts/router.js`,
which updates the URL hash; `scripts/hub.js` swaps the view fragment and every
subscriber (including this block) reacts. The block also subscribes to route
changes itself so deep links, back/forward and navigation started in the
listing keep the tree revealed and highlighted. View ids come from
`scripts/hub-views.js`.

## Module map

| File | Responsibility |
|------|----------------|
| `assetsnavigation.js` | Entry point: renders the skeleton, binds events, loads the folder tree and the user footer |
| `render.js` | DOM builders: header, primary nav, recursive folder nodes, user footer states |
| `events.js` | Delegated click handler + route subscription (expand/collapse, lazy child loading, reveal + highlight) |
| `data.js` | Primary nav registry, auth status / login flow, folder fetches mapped to the nav shape |
| `state.js` | Persisted set of expanded folder paths in localStorage |
| `icons.js` | Inline SVG icons (inlined so `currentColor` follows the CSS state) |

## Key behaviours

- **Lazy tree**: each folder level is fetched on first expand; a `reveal`
  request (see `fetchFoldersReveal`) loads several levels in one round-trip
  when restoring a deep link or persisted expansions.
- **Login**: `startLogin()` stores the current location (including the hash)
  in a cookie and navigates to the protected `/bin/assetshub/auth/login`
  route, which triggers the AEM/IMS login and redirects back (see
  `LoginServlet` in the assetshub bundle). Do not add redirect hops in front
  of it — that broke the IMS round-trip.
- Only UI state (expanded paths) is persisted — never listing content, which
  is permission-sensitive.
