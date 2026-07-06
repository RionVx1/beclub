// PDF preview generation module
// Handles generating SVG previews from PDF files using PDF.js

import { escapeSvgAttribute } from "./utils.js";

/**
 * Generate a small SVG preview for the first page of a PDF buffer.
 * Uses `pdfjsLib` (expected to be loaded in the admin page) and renders
 * the page to a canvas, then embeds the raster image into an SVG.
 * Returns a string containing the SVG XML.
 * @param {ArrayBuffer} pdfBuffer
 * @returns {Promise<string>}
 */
async function generatePreviewSvgFromPdfBuffer(pdfBuffer) {
  try {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("PDF preview engine is not loaded in admin panel.");
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    // Use a copy of the ArrayBuffer so pdfjs doesn't detach the original
    // buffer (some implementations may transfer/detach buffers for performance).
    const bufferCopy = pdfBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = Math.min(baseViewport.width, 480);
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext("2d", { alpha: false });
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const imageDataUrl = canvas.toDataURL("image/webp", 0.75);
    const safeImageDataUrl = escapeSvgAttribute(imageDataUrl);

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">` +
      `<image href="${safeImageDataUrl}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="xMinYMin meet"/>` +
      "</svg>\n"
    );
  } catch (err) {
    console.error("Failed to generate PDF preview:", err);
    throw new Error(`PDF preview generation failed: ${err.message}`);
  }
}

export { generatePreviewSvgFromPdfBuffer };
