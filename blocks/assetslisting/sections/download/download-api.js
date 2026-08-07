/*
 * Client for the direct (publish) download servlet — Scenario A of the hub
 * download flow. POSTs the selection and gets back the assets' originals: a
 * single file as-is, or a ZIP when several are selected. The servlet reads
 * publish binaries under the caller's own session, so this is a plain same-origin
 * request — never embed credentials here.
 */

const DOWNLOAD_ENDPOINT = '/bin/assetshub/download';
const CSRF_TOKEN_ENDPOINT = '/libs/granite/csrf/token.json';

/**
 * Granite CSRF token for the current session. AEM's CSRF filter rejects
 * state-changing requests from an authenticated user without it. Best-effort:
 * returns null when unavailable so the request still proceeds where the filter
 * is inactive.
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
 * Reads the file name the server suggests in Content-Disposition, or null.
 * @param {Response} response
 * @returns {string|null}
 */
function filenameFromResponse(response) {
  const header = response.headers.get('Content-Disposition') || '';
  const match = header.match(/filename="?([^"]+)"?/i);
  return match ? match[1] : null;
}

/** Best-effort extraction of the servlet's JSON `error` message. */
async function errorMessage(response) {
  try {
    const data = await response.json();
    return data && data.error ? data.error : undefined;
  } catch (error) {
    return undefined;
  }
}

/** Triggers the browser "save file" for a blob, cleaning up the object URL. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has a chance to start.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Requests a direct download of the selected assets' originals.
 * @param {string[]} paths selected asset paths (no folders — those share instead)
 * @returns {Promise<
 *   { ok: true, blob: Blob, filename: string }
 *   | { ok: false, reason: string, status?: number, message?: string }
 * >}
 */
export default async function requestDownload(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ok: false, reason: 'invalid' };
  }

  const csrfToken = await fetchCsrfToken();
  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(DOWNLOAD_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ paths }),
    });
  } catch (error) {
    return { ok: false, reason: 'network' };
  }

  if (response.status === 401) return { ok: false, reason: 'unauthenticated' };
  if (response.status === 403) return { ok: false, reason: 'forbidden' };
  if (response.status === 413) {
    return { ok: false, reason: 'too-large', message: await errorMessage(response) };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: 'error',
      status: response.status,
      message: await errorMessage(response),
    };
  }

  const blob = await response.blob();
  return { ok: true, blob, filename: filenameFromResponse(response) || 'descarga' };
}
