/*
 * Client for the upload endpoints. Same-origin, so auth is the serving layer's
 * concern — never embed credentials here (public client-side code).
 *
 *  - checkCreatePermission: GET the publish permission bridge, which forwards
 *    the session user + path to author and returns granular flags. Upload is
 *    only offered when the user can create under the target folder.
 *  - uploadAssets: POST a multipart batch to the publish upload bridge, which
 *    fans each file out to author (see the assetshub servlets). Each file's
 *    path relative to the target folder travels as its multipart filename, so
 *    whole folders can be uploaded.
 */

const CHECK_ENDPOINT = '/bin/assetshub/bridge/check';
const UPLOAD_ENDPOINT = '/bin/assetshub/bridge/upload';
const CSRF_TOKEN_ENDPOINT = '/libs/granite/csrf/token.json';

/** Max files accepted in one batch — mirrors the server-side cap. */
export const MAX_FILES = 100;

/**
 * Fetches the Granite CSRF token for the current session. AEM's CSRF filter
 * rejects state-changing requests (POST/PUT/DELETE) from an authenticated user
 * that don't carry a valid `CSRF-Token` header, so the upload POST needs it —
 * the read-only checks (GET) do not. Best-effort: returns null when the token
 * cannot be obtained (e.g. the filter is not active in this environment), so
 * the upload still proceeds.
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
 * Resolves whether the current user may create assets under a folder.
 * @param {string} path DAM folder path
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function checkCreatePermission(path) {
  const url = new URL(CHECK_ENDPOINT, window.location);
  url.searchParams.set('path', path);

  let response;
  try {
    response = await fetch(`${url.pathname}${url.search}`);
  } catch (error) {
    return { allowed: false, reason: 'network' };
  }

  if (response.status === 401) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    return { allowed: false, reason: 'error' };
  }

  const result = data && data.authorResult;
  if (result && result.userExists === false) {
    return { allowed: false, reason: 'unknown-user' };
  }
  if (result && result.canCreate === true) {
    return { allowed: true };
  }
  return { allowed: false, reason: response.ok ? 'forbidden' : 'error' };
}

/**
 * Uploads a batch of files to a target folder. Uses XHR so overall upload
 * progress can be reported.
 * @param {string} path target DAM folder
 * @param {Array<{ file: File, relativePath: string }>} items
 * @param {(fraction: number) => void} [onProgress] 0..1 upload progress
 * @returns {Promise<{ status: number, body: Object }>}
 */
export async function uploadAssets(path, items, onProgress) {
  const form = new FormData();
  form.append('path', path);
  items.forEach(({ file, relativePath }) => {
    // The relative path travels as the multipart filename (3rd arg).
    form.append('file', file, relativePath);
  });

  const csrfToken = await fetchCsrfToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_ENDPOINT);
    xhr.responseType = 'json';
    // Same-origin XHR sends the session cookies automatically; the CSRF token
    // satisfies AEM's CSRF filter for this state-changing request.
    xhr.withCredentials = true;
    if (csrfToken) xhr.setRequestHeader('CSRF-Token', csrfToken);

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      });
    }

    xhr.addEventListener('load', () => {
      const body = xhr.response || {};
      resolve({ status: xhr.status, body });
    });
    xhr.addEventListener('error', () => reject(new Error('upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('upload aborted')));

    xhr.send(form);
  });
}
