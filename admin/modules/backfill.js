// Preview backfill module
// Handles generating missing SVG previews for existing articles

import { 
  isSafePdfFilename, 
  previewFilenameFromPdf 
} from "./utils.js";
import { 
  getFileSha, 
  uploadToGithub, 
  getGithubToken,
  GITHUB_CONFIG 
} from "./github-api.js";
import { 
  loadManifest, 
  fetchArticlePdfBuffer 
} from "./data-loader.js";
import { 
  generatePreviewSvgFromPdfBuffer 
} from "./pdf-preview.js";
import { 
  showPreviewBackfillStatus 
} from "./ui-utils.js";

/**
 * Iterate through `articles.json` and generate SVG previews for PDF files
 * that are missing from the preview directory. Uses `uploadToGithub` to add
 * new preview files.
 */
export async function handleBackfillPreviews() {
  const token = getGithubToken();
  if (!token) {
    showPreviewBackfillStatus("Enter your GitHub token first.", "error");
    return;
  }

  const btn = document.getElementById("backfill-previews-btn");
  if (btn) btn.disabled = true;

  try {
    const manifest = await loadManifest();
    const articles = (manifest.articles || []).filter(
      (a) => a && isSafePdfFilename(a.file),
    );

    if (!articles.length) {
      showPreviewBackfillStatus("No valid PDF articles found.", "error");
      return;
    }

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < articles.length; i += 1) {
      const article = articles[i];
      const previewPath = `${GITHUB_CONFIG.previewDir}/${previewFilenameFromPdf(article.file)}`;

      showPreviewBackfillStatus(
        `Checking ${i + 1}/${articles.length}: ${article.file}`,
        "uploading",
      );

      const sha = await getFileSha(token, previewPath);
      if (sha) {
        skipped += 1;
        continue;
      }

      try {
        showPreviewBackfillStatus(
          `Generating preview ${i + 1}/${articles.length}: ${article.file}`,
          "uploading",
        );
        const pdfBuffer = await fetchArticlePdfBuffer(article.file);
        const svgContent = await generatePreviewSvgFromPdfBuffer(pdfBuffer);
        await uploadToGithub(
          token,
          previewPath,
          svgContent,
          `Backfill article preview: ${article.title || article.file}`,
        );
        created += 1;
      } catch (err) {
        console.error(`Failed to generate preview for ${article.file}:`, err);
        failed += 1;
      }
    }

    const summary = `Backfill complete. Created: ${created}, skipped existing: ${skipped}, failed: ${failed}.`;
    showPreviewBackfillStatus(summary, failed ? "error" : "success");
  } catch (err) {
    showPreviewBackfillStatus(err.message, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}
