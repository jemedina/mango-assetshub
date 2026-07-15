/*
 * Turns a drop (or file/folder picker selection) into a flat list of
 * { file, relativePath } entries, preserving folder structure so the server can
 * recreate the tree under the target folder.
 *
 * Folder drops rely on the (widely supported, non-standard) DataTransferItem
 * `webkitGetAsEntry` API and the FileSystem*Entry readers; plain multi-file
 * inputs fall back to the file name, and `<input webkitdirectory>` selections
 * carry `webkitRelativePath`.
 */

/** Reads all entries of a directory reader, paging until it returns none. */
function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

/** Resolves a FileSystemFileEntry to its File. */
function entryFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

/**
 * Recursively walks a FileSystem entry, collecting files with their path
 * relative to the drop root (leading slash stripped).
 */
async function walkEntry(entry, out) {
  if (entry.isFile) {
    const file = await entryFile(entry);
    out.push({ file, relativePath: entry.fullPath.replace(/^\/+/, '') });
    return;
  }
  if (entry.isDirectory) {
    const children = await readAllEntries(entry.createReader());
    // Sequential to keep memory bounded and order stable.
    await children.reduce(
      (chain, child) => chain.then(() => walkEntry(child, out)),
      Promise.resolve(),
    );
  }
}

/**
 * Extracts { file, relativePath } entries from a drop event, descending into
 * dropped folders when the browser exposes filesystem entries.
 * @param {DataTransfer} dataTransfer
 * @returns {Promise<Array<{ file: File, relativePath: string }>>}
 */
export async function itemsFromDrop(dataTransfer) {
  const items = Array.from(dataTransfer.items || []);
  const supportsEntries = items.some((item) => typeof item.webkitGetAsEntry === 'function');

  if (!supportsEntries) {
    return Array.from(dataTransfer.files || []).map((file) => ({ file, relativePath: file.name }));
  }

  const entries = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry())
    .filter(Boolean);

  const out = [];
  await entries.reduce(
    (chain, entry) => chain.then(() => walkEntry(entry, out)),
    Promise.resolve(),
  );
  return out;
}

/**
 * Extracts entries from an <input type="file"> selection. Honors
 * `webkitRelativePath` for directory pickers, else uses the file name.
 * @param {FileList} fileList
 * @returns {Array<{ file: File, relativePath: string }>}
 */
export function itemsFromInput(fileList) {
  return Array.from(fileList || []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
}
