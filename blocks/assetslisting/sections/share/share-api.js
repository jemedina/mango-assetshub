/*
 * Client for AEM's out-of-the-box adhoc link share, driven straight from the
 * browser as a natural same-origin request — no custom servlet in the middle.
 *
 * A share is created by POSTing `:operation=generateShareLink` to the OOTB
 * `.adhocassetshare.html` selector on a DAM anchor resource (the folder being
 * viewed), passing the explicit list of selected asset paths. Publish creates a
 * token node under `/var/dam/share/<uuid>` holding that closed path list plus the
 * expiration, and answers with the `linkshare.html?sh=<token>` URL that resolves
 * anonymously (the token is the authentication).
 *
 * Same-origin, so auth is the serving layer's concern — never embed credentials
 * here (public client-side code). The only state-changing call needs the Granite
 * CSRF token, mirroring the upload client.
 */

const CSRF_TOKEN_ENDPOINT = '/libs/granite/csrf/token.json';
const SHARE_SELECTOR = '.adhocassetshare.html';

/** Default validity window of a generated link, in days. */
export const DEFAULT_EXPIRATION_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Fetches the Granite CSRF token for the current session. AEM's CSRF filter
 * rejects state-changing requests from an authenticated user without a valid
 * `CSRF-Token` header. Best-effort: returns null when it cannot be obtained, so
 * the request still proceeds where the filter is inactive.
 * @returns {Promise<string|null>}
 */
async function fetchCsrfToken() {
  try {
    const response = await fetch(CSRF_TOKEN_ENDPOINT, { credentials: 'same-origin' });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.token ? data.token : null;
  } catch (error) {
    return null;
  }
}

/**
 * ISO-8601 expiration timestamp `days` from now, normalised to whole seconds
 * (`.000Z`) to match the form the OOTB operation is known to accept.
 * @param {number} days
 * @returns {string}
 */
function expirationFromNow(days) {
  return new Date(Date.now() + days * MS_PER_DAY)
    .toISOString()
    .replace(/\.\d{3}Z$/, '.000Z');
}

/**
 * Pulls the share link out of the OOTB HTML response. The operation echoes the
 * generated URL in the status line (`Share link:http://…/linkshare.html?sh=…`);
 * we only need the token, then rebuild the URL against the current origin so the
 * link is reachable through the same host that serves the app (the raw URL AEM
 * returns carries the Externalizer host, which locally points elsewhere).
 * @param {string} html
 * @returns {{ token: string, shareUrl: string, rawUrl: string|null }|null}
 */
function parseShareResponse(html) {
  const tokenMatch = html.match(/linkshare\.html\?sh=([\w.-]+)/);
  if (!tokenMatch) return null;
  const token = tokenMatch[1];
  const rawMatch = html.match(/https?:\/\/[^\s"'<>]*\/linkshare\.html\?sh=[\w.-]+/);
  return {
    token,
    shareUrl: `${window.location.origin}/linkshare.html?sh=${token}`,
    rawUrl: rawMatch ? rawMatch[0] : null,
  };
}

/**
 * Generates an anonymous share link for a set of assets.
 * @param {string} anchorPath DAM resource the share is anchored on (the current
 *   folder; selection is folder-scoped so it is always the common parent)
 * @param {string[]} paths explicit list of asset paths to share
 * @param {{ expirationDays?: number, allowOriginal?: boolean,
 *   allowRenditions?: boolean }} [options]
 * @returns {Promise<
 *   { ok: true, token, shareUrl, rawUrl, expiresAt }
 *   | { ok: false, reason: string, status?: number }
 * >}
 */
export async function createShareLink(anchorPath, paths, options = {}) {
  if (!anchorPath || !Array.isArray(paths) || paths.length === 0) {
    return { ok: false, reason: 'invalid' };
  }

  const {
    expirationDays = DEFAULT_EXPIRATION_DAYS,
    allowOriginal = true,
    allowRenditions = true,
  } = options;
  const expiresAt = expirationFromNow(expirationDays);

  const body = new URLSearchParams();
  body.append(':operation', 'generateShareLink');
  body.append('_charset_', 'utf-8');
  paths.forEach((path) => body.append('path', path));
  body.append('expirationDate', expiresAt);
  body.append('allowOriginal', String(allowOriginal));
  body.append('allowRenditions', String(allowRenditions));

  const csrfToken = await fetchCsrfToken();
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' };
  if (csrfToken) headers['CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(`${anchorPath}${SHARE_SELECTOR}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: body.toString(),
    });
  } catch (error) {
    return { ok: false, reason: 'network' };
  }

  if (response.status === 401) return { ok: false, reason: 'unauthenticated' };
  if (response.status === 403) return { ok: false, reason: 'forbidden' };
  if (!response.ok) return { ok: false, reason: 'error', status: response.status };

  const parsed = parseShareResponse(await response.text());
  if (!parsed) return { ok: false, reason: 'no-link' };
  return { ok: true, ...parsed, expiresAt };
}

/* ------------------------------------------------------------- via author === */

const BRIDGE_SHARE_ENDPOINT = '/bin/assetshub/bridge/sharelink';
const USER_EXISTS_ENDPOINT = '/bin/assetshub/bridge/user-exists';

/**
 * Pre-generation gate: does the current session user exist on the author
 * instance? A share link's owner must be a real author user for the anonymous
 * viewer to resolve it, so the modal checks this before minting a link — and, if
 * the user is missing, points them to author to provision their account.
 *
 * @returns {Promise<
 *   { ok: true, exists: boolean, authorBaseUrl: string|null }
 *   | { ok: false, reason: string, status?: number }
 * >}
 */
export async function checkUserInAuthor() {
  let response;
  try {
    response = await fetch(USER_EXISTS_ENDPOINT, { credentials: 'same-origin' });
  } catch (error) {
    return { ok: false, reason: 'network' };
  }

  if (response.status === 401) return { ok: false, reason: 'unauthenticated' };

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok || !data || !data.ok) {
    return { ok: false, reason: 'error', status: response.status };
  }
  return { ok: true, exists: !!data.exists, authorBaseUrl: data.authorBaseUrl || null };
}

/**
 * Requests a share link created ON AUTHOR through the publish bridge servlet
 * (PoC fase 1): the selection — folders, assets or a mix — travels as-is and the
 * OOTB share is generated by the tech account on the author instance, whose
 * repository is durable (publish pods are ephemeral). The returned link points
 * at the author host.
 *
 * @param {string[]} paths selected folder/asset paths
 * @param {{ expirationDays?: number, allowOriginal?: boolean,
 *   allowRenditions?: boolean }} [options]
 * @returns {Promise<
 *   { ok: true, shareUrl, expiresAt, sharedPaths }
 *   | { ok: false, reason: string, status?: number, message?: string }
 * >}
 */
export async function requestShareLink(paths, options = {}) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ok: false, reason: 'invalid' };
  }

  const csrfToken = await fetchCsrfToken();
  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(BRIDGE_SHARE_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        paths,
        expirationDays: options.expirationDays,
        allowOriginal: options.allowOriginal,
        allowRenditions: options.allowRenditions,
      }),
    });
  } catch (error) {
    return { ok: false, reason: 'network' };
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (response.status === 401) return { ok: false, reason: 'unauthenticated' };
  if (response.status === 403) return { ok: false, reason: 'forbidden' };
  if (!response.ok || !data || !data.ok) {
    return {
      ok: false,
      reason: 'error',
      status: response.status,
      message: data && data.error ? data.error : undefined,
    };
  }
  return {
    ok: true,
    shareUrl: data.shareUrl,
    expiresAt: data.expiresAt,
    sharedPaths: data.sharedPaths || [],
  };
}
