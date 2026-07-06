// Utility functions for admin panel

/**
 * Convert free-form text into a URL-friendly slug.
 * Lowercases, replaces non-alphanumerics with `-`, and trims `-`.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate that `fileName` is a simple PDF filename with no path parts
 * and no traversal components. Returns `true` for safe names.
 * @param {string} fileName
 * @returns {boolean}
 */
export function isSafePdfFilename(fileName) {
  return (
    typeof fileName === "string" &&
    /\.pdf$/i.test(fileName) &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !fileName.includes("..")
  );
}

/**
 * Escape a string to be safely embedded inside an SVG attribute value.
 * Replaces `&`, `"`, `<`, and `>` with HTML entities.
 * @param {string} value
 * @returns {string}
 */
export function escapeSvgAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Read a `File`/`Blob` as an ArrayBuffer using FileReader.
 * Returns a Promise that resolves with the buffer or rejects on error.
 * @param {File|Blob} file
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Turn a PDF filename into the corresponding preview SVG filename.
 * Example: "doc.pdf" -> "doc.svg".
 * @param {string} pdfFileName
 * @returns {string}
 */
export function previewFilenameFromPdf(pdfFileName) {
  return pdfFileName.replace(/\.pdf$/i, ".svg");
}

/**
 * Lookup a field label by its `value` from the `FIELDS` config.
 * Falls back to returning the raw `value` when no match is found.
 */
export function fieldLabel(value, fields) {
  return fields.find((f) => f.value === value)?.label || value;
}

/**
 * Get the relative path to a preview SVG for a PDF filename.
 * @param {string} pdfFileName
 * @returns {string}
 */
export function getPreviewPath(pdfFileName) {
  return `../Articles/preview/${previewFilenameFromPdf(pdfFileName)}`;
}

/**
 * Generic status setter for admin UI elements.
 * elementId: id of the DOM element to write status to
 * extraClass: optional additional class name to scope status (e.g. 'podcast-status')
 */
export function setStatus(elementId, message, type, extraClass = "") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status ${extraClass} ${type}`.trim();
}
