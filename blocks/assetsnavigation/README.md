# assetsnavigation

The app's left sidebar: primary navigation between SPA views, a lazy-loaded DAM
folder tree, and the user footer (profile or login).

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
