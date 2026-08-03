/*
 * Client for the Assets Hub share-link endpoints (bridge).
 *
 * Share links are OOTB adhoc link shares stored on author (/var/dam/share), so
 * they are read through the publish-side bridge servlets:
 *   - /bin/assetshub/bridge/sharelink/list  -> every share, newest first, each
 *     stamped with `canSeeLink` (whether the session user created it)
 *   - /bin/assetshub/bridge/sharelink/open  -> derives one share's public URL,
 *     creator-only; the listing never carries live links, so this is a
 *     separate, audited per-click call
 *
 * Requests are same-origin so they flow through whatever serves the app; any
 * authentication is the serving layer's concern and must never be embedded
 * here — this is public client-side code.
 */

const LIST_ENDPOINT = '/bin/assetshub/bridge/sharelink/list';
const OPEN_ENDPOINT = '/bin/assetshub/bridge/sharelink/open';

/**
 * Fetches every share link, newest first.
 * @returns {Promise<{ count: number, requestUser: string, shares: Array<{
 *   id: string, paths: string[], createdBy: string, created: string,
 *   expirationDate: string|null, expired: boolean, allowOriginal: boolean,
 *   allowRenditions: boolean, canSeeLink: boolean }> }>}
 */
export async function fetchShareLinks() {
  const response = await fetch(LIST_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Unable to load share links: ${response.status}`);
  }
  return response.json();
}

/** Error thrown when link derivation is denied or the share is gone. */
export class ShareLinkError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Derives the public (anonymous) URL of one share. Only the share's creator
 * may do this; the bridge forwards the session user and author decides.
 * @param {string} id share id (its node name under /var/dam/share)
 * @returns {Promise<string>} the share's public URL
 * @throws {ShareLinkError} 403 when the user is not the creator, 404 when the
 *   share no longer exists (expired shares are purged on author)
 */
export async function fetchShareLinkUrl(id) {
  const url = new URL(OPEN_ENDPOINT, window.location);
  url.searchParams.set('node', id);
  const response = await fetch(`${url.pathname}${url.search}`);
  if (response.status === 403) {
    throw new ShareLinkError(403, 'Solo quien creó el enlace puede generarlo');
  }
  if (response.status === 404) {
    throw new ShareLinkError(404, 'El enlace ya no existe');
  }
  if (!response.ok) {
    throw new Error(`Unable to open share link: ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.url) {
    throw new Error('Share link response carried no URL');
  }
  return payload.url;
}
