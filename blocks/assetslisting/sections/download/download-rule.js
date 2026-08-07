/*
 * Single source of truth for the download-vs-share routing (Scenario A vs B).
 *
 * A selection downloads directly (Scenario A) only when it is bounded and free
 * of folders; anything else — a folder, more than 50 assets, or 256 MiB or more
 * — routes to a share link (Scenario B). Both the selection bar's button label
 * and the primary action read this same rule so they can never disagree.
 *
 * These limits mirror DownloadServlet's OSGi defaults on the backend; the servlet
 * re-checks them as the authoritative guard.
 */

export const MAX_DOWNLOAD_ASSETS = 50;
export const MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024;

/**
 * Whether a selection qualifies for a direct download (Scenario A).
 * @param {{ count: number, totalBytes: number, hasFolder: boolean }} selection
 * @returns {boolean}
 */
export function canAutoDownload({ count, totalBytes, hasFolder }) {
  return !hasFolder
    && count > 0
    && count <= MAX_DOWNLOAD_ASSETS
    && totalBytes < MAX_DOWNLOAD_BYTES;
}
