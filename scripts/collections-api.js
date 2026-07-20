/*
 * Client for the Assets Hub collections endpoints (PoC).
 *
 * Collections are not published to publish out of the box, so they are read from
 * author through the publish-side bridge servlets:
 *   - /bin/assetshub/bridge/collections        -> the collections the user may see
 *   - /bin/assetshub/bridge/collections/items  -> one collection's members
 * The bridge forwards the current session user to author, which decides
 * visibility (including private collections shared with the user) via an ACL
 * check; the members are then rendered from publish with the user's own session.
 *
 * Requests are same-origin so they flow through whatever serves the app; any
 * authentication is the serving layer's concern and must never be embedded here.
 */

const COLLECTIONS_ENDPOINT = '/bin/assetshub/bridge/collections';
const COLLECTION_ITEMS_ENDPOINT = '/bin/assetshub/bridge/collections/items';
const COLLECTION_ADD_ENDPOINT = '/bin/assetshub/bridge/collections/add';
const CSRF_TOKEN_ENDPOINT = '/libs/granite/csrf/token.json';

/**
 * Fetches the collections the current user may see.
 * Smart collections (saved searches) are included alongside regular ones and
 * flagged with `smart: true`; their `count`/`thumbnail` are resolved by running
 * the saved query on publish with the user's session.
 * @returns {Promise<{ collections: Array<{
 *   id: string, title: string, description?: string, createdBy?: string,
 *   public: boolean, smart: boolean, count: number, thumbnail?: string }> }>}
 */
export async function fetchCollections() {
  const url = new URL(COLLECTIONS_ENDPOINT, window.location);
  const response = await fetch(`${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new Error(`Unable to load collections: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches a single collection's members, in the same shape as the folder listing
 * ({@code folders} + {@code assets}), so the same card grid can paint them.
 * @param {string} id collection id (jcr:uuid or path)
 * @returns {Promise<{ id: string, title: string, public: boolean, smart: boolean,
 *   folders: Array, assets: Array }>}
 */
export async function fetchCollectionItems(id) {
  const url = new URL(COLLECTION_ITEMS_ENDPOINT, window.location);
  url.searchParams.set('id', id);
  const response = await fetch(`${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new Error(`Unable to load collection: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches the Granite CSRF token for the current session. AEM's CSRF filter
 * rejects state-changing requests from an authenticated user without it.
 * Best-effort: returns null when it cannot be obtained.
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
 * Adds an asset to a collection through the publish bridge (which forwards to
 * author, where the write happens after a permission check: the user must be able
 * to modify the collection). Idempotent — adding an already-present asset resolves
 * with `alreadyMember: true`.
 * @param {string} id collection id (jcr:uuid or path)
 * @param {string} assetPath JCR path of the asset to add
 * @returns {Promise<
 *   { ok: true, added: boolean, alreadyMember: boolean }
 *   | { ok: false, reason: string, status?: number, message?: string }>}
 */
export async function addAssetToCollection(id, assetPath) {
  if (!id || !assetPath) return { ok: false, reason: 'invalid' };

  const csrfToken = await fetchCsrfToken();
  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(COLLECTION_ADD_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ id, path: assetPath }),
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
  return { ok: true, added: !!data.added, alreadyMember: !!data.alreadyMember };
}
