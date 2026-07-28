/*
 * App-wide session guard.
 *
 * The assets hub is authenticated-only: every runtime page needs a live AEM/IMS
 * session. This module owns that contract — it fetches the auth status once,
 * and when the user is signed out it starts the login redirect itself instead of
 * asking any UI to offer a "Login" button. The return trip is handled by
 * scripts/login-return.js, which reads the same redirect cookie.
 */

export const AUTH_STATUS_PATH = '/bin/assetshub/auth/status';

// Protected login servlet (LoginServlet). Navigating STRAIGHT to it — a
// protected route — triggers the AEM/IMS login, and once authenticated AEM
// replays the request so the servlet redirects the user back to the saved
// target. Going directly, with no intermediate redirect, mirrors the flow that
// reliably completes the IMS login (an extra redirect hop in front of it broke
// the round-trip).
export const LOGIN_PATH = '/bin/assetshub/auth/login';

// Where the pre-login location is stashed so it can be restored afterwards.
// Shared with scripts/login-return.js.
export const REDIRECT_COOKIE = 'mango-login-redirect';

export async function fetchAuthStatus(path = AUTH_STATUS_PATH) {
  const url = new URL(path, window.location);
  const response = await fetch(url.pathname);
  if (!response.ok) {
    throw new Error(`Unable to load auth status: ${response.status}`);
  }

  return response.json();
}

/**
 * Starts login. Remembers the current location — path, query and hash, so the
 * hash-based SPA view (see scripts/router.js) is restored — in a cookie the
 * login servlet reads, then navigates straight to the protected login route to
 * trigger the AEM/IMS login. On return the servlet (or, as a fallback, the EDS
 * client-side restore in scripts/login-return.js) sends the user back here.
 */
export function startLogin() {
  const {
    pathname, search, hash, protocol,
  } = window.location;
  const returnTo = `${pathname}${search}${hash}`;
  const secure = protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REDIRECT_COOKIE}=${encodeURIComponent(returnTo)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
  window.location.assign(LOGIN_PATH);
}

let sessionPromise;

/**
 * Ensures the page has a live session, memoized so it runs once per page.
 * Resolves with the auth status when signed in. When signed out (or the status
 * can't be read) it starts the login redirect and returns a promise that never
 * settles — the document is unloading, so callers must not fall through and
 * render a signed-out state in the interim.
 * @returns {Promise<Object>} the auth status for signed-in users
 */
export function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = fetchAuthStatus().catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      startLogin();
      return new Promise(() => {});
    });
  }
  return sessionPromise;
}
