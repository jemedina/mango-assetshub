/*
 * Post-login view restoration.
 *
 * The login gate (AEM LoginRedirectServlet) saves where the user was — path,
 * query and hash — in the `mango-login-redirect` cookie before sending them
 * through the AEM/IMS login. AEM's post-login redirect can't carry a URL
 * fragment and, on publish, often lands the user on a base page instead of the
 * callback, so the hash-based SPA view (see scripts/router.js) is lost. On load
 * we read that cookie, clear it, and restore the destination.
 *
 * Runs before the router starts so the restored hash is in place on first
 * render. The cookie is only ever a same-origin path, re-validated here.
 */

const REDIRECT_COOKIE = 'mango-login-redirect';

function readCookie(name) {
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch (e) {
    return null;
  }
}

function clearCookie(name) {
  const { hostname } = window.location;
  // Clear the host-only variant and the domain-scoped one the gate may have set.
  document.cookie = `${name}=; Max-Age=0; Path=/`;
  document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${hostname}`;
}

/**
 * Same-origin absolute-path guard, mirroring the server-side validation: only a
 * path starting with a single "/" is accepted — never "//", a scheme, or a
 * backslash trick.
 * @param {string} value
 * @returns {string|null}
 */
function safeTarget(value) {
  if (!value || value[0] !== '/') return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.includes('\\')) return null;
  return value;
}

/**
 * Restores the destination saved before login, if any.
 * @returns {boolean} true when a full-page navigation was triggered (caller
 * should stop further page setup, the document is unloading).
 */
export default function restoreLoginReturn() {
  const raw = readCookie(REDIRECT_COOKIE);
  if (!raw) return false;

  clearCookie(REDIRECT_COOKIE);

  const target = safeTarget(raw);
  if (!target) return false;

  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}${hash}`;
  if (target === current) return false;

  const targetPath = target.split('#')[0];
  if (targetPath === `${pathname}${search}`) {
    // Same document, only the hash differs: restore the view without a reload.
    window.location.hash = target.slice(targetPath.length);
    return false;
  }

  // Different document: a full navigation is needed to reach the right shell.
  window.location.replace(target);
  return true;
}
