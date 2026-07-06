// Articles management module
// Handles article upload, removal, and listing

/**
 * Form handler and UI helpers for managing PDF articles and their previews.
 */

import { 
  slugify, 
  isSafePdfFilename, 
  readFileAsArrayBuffer, 
  previewFilenameFromPdf,
  fieldLabel,
  setStatus,
} from "./utils.js";
import { 
  uploadToGithub, 
  uploadArticle, 
  removeArticleFromGithub, 
  getGithubToken 
} from "./github-api.js";
import { 
  loadManifest, 
  fetchArticlePdfBuffer 
} from "./data-loader.js";
import { 
  generatePreviewSvgFromPdfBuffer 
} from "./pdf-preview.js";
import { 
  MAX_ARTICLE_SIZE, 
  FIELDS, 
  TAGS 
} from "./config.js";
import { GITHUB_CONFIG } from "./github-api.js";
import { 
  validateArticleData, 
  showValidationErrors 
} from "./validation.js";

// use setStatus from utils.js for upload-status

/**
 * Handle the article form submission:
 * - validate and sanitize inputs
 * - generate preview SVG
 * - upload PDF, preview, and updated articles.json to GitHub
 */
export async function handleArticleSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    setStatus("upload-status", "Enter your GitHub token to upload.", "error");
    return;
  }

  const title = document.getElementById("article-title").value.trim();
  const desc = document.getElementById("article-desc").value.trim();
  const tag = document.getElementById("article-tag").value;
  const field = document.getElementById("article-field").value;
  const fileInput = document.getElementById("article-file");
  const file = fileInput.files[0];

  if (!file) {
    setStatus("upload-status", "Please select a PDF article file.", "error");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("upload-status", "Articles must be PDF files.", "error");
    return;
  }

  if (file.size > MAX_ARTICLE_SIZE) {
    setStatus(
      "upload-status",
      "Selected file is too large. Maximum size is 1 MB per file.",
      "error",
    );
    return;
  }

  // Validate and sanitize text input
  const validation = validateArticleData({
    title,
    desc,
    tag,
    field,
  });

  if (!validation.valid) {
    showValidationErrors(
      validation.errors,
      "upload-status",
      (m, t) => setStatus("upload-status", m, t),
    );
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  setStatus(`upload-status`, `Uploading ${file.name} to Articles/…`, "uploading");

  try {
    const content = await readFileAsArrayBuffer(file);
    const manifest = await loadManifest();
    const slug = slugify(validation.sanitized.title);
    const filename = file.name.toLowerCase().includes(slug)
      ? file.name
      : `${slug}.pdf`;

    setStatus("upload-status", "Generating SVG preview from page 1…", "uploading");
    const previewSvgContent = await generatePreviewSvgFromPdfBuffer(content);

    const entry = {
      id: slug,
      title: validation.sanitized.title,
      desc: validation.sanitized.desc,
      tag: validation.sanitized.tag,
      field: validation.sanitized.field,
      file: filename,
      date: new Date().toISOString().slice(0, 10),
    };

    const existing = manifest.articles.findIndex(
      (a) => a.id === slug || a.file === filename,
    );
    if (existing >= 0) {
      manifest.articles[existing] = entry;
    } else {
      manifest.articles.push(entry);
    }

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    const articlePath = `${GITHUB_CONFIG.articlesDir}/${filename}`;
    const previewPath = `${GITHUB_CONFIG.previewDir}/${previewFilenameFromPdf(filename)}`;

    await uploadArticle(
      token,
      articlePath,
      content,
      previewPath,
      previewSvgContent,
      manifestJson,
      validation.sanitized.title,
    );

    setStatus(
      "upload-status",
      `Published! "${validation.sanitized.title}" PDF, preview SVG, and articles.json were updated.`,
      "success",
    );
    e.target.reset();
    renderArticleList(manifest.articles);
  } catch (err) {
    setStatus("upload-status", err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Remove an article entry from the manifest and delete related files on GitHub.
 * Prompts the user for confirmation.
 */
export async function removeArticle(id) {
  const token = getGithubToken();
  if (!token) {
    setStatus("upload-status", "Enter your GitHub token to remove articles.", "error");
    return;
  }

  const manifest = await loadManifest();
  const article = manifest.articles.find((a) => a.id === id);
  if (!article) return;

  if (!confirm(`Remove "${article.title}" from the site?`)) return;

  setStatus("upload-status", "Removing article…", "uploading");

  try {
    manifest.articles = manifest.articles.filter((a) => a.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await removeArticleFromGithub(
      token,
      article.file,
      manifestJson,
      article.title,
      previewFilenameFromPdf,
    );
    setStatus("upload-status", `Removed "${article.title}".`, "success");
    renderArticleList(manifest.articles);
  } catch (err) {
    setStatus("upload-status", err.message, "error");
  }
}

/**
 * Render the article list into the `#file-list` element.
 * Attaches remove handlers to each item.
 */
export function renderArticleList(articles) {
  const listEl = document.getElementById("file-list");
  if (!listEl) return;

  if (!articles.length) {
    listEl.innerHTML =
      '<p class="file-empty">No articles in Articles/ yet.</p>';
    return;
  }

  listEl.innerHTML = articles
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(
      (a) => `
      <div class="file-item">
        <div class="file-info">
          <span class="file-name">${a.title}</span>
          <span class="file-meta">${fieldLabel(a.field, FIELDS)} · ${a.tag} · Articles/${a.file}</span>
        </div>
        <div class="file-actions">
          <a href="../Articles/read.html?file=${encodeURIComponent(a.file)}&title=${encodeURIComponent(a.title)}" class="file-link" target="_blank">View</a>
          <button class="file-remove" data-id="${a.id}">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  listEl.querySelectorAll(".file-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeArticle(btn.dataset.id));
  });
}

/**
 * Initialize the article form controls (field/tag selects and submit handler).
 */
export function initArticleForm() {
  const fieldSelect = document.getElementById("article-field");
  const tagSelect = document.getElementById("article-tag");

  FIELDS.forEach((f) => {
    fieldSelect.add(new Option(f.label, f.value));
  });
  TAGS.forEach((t) => {
    tagSelect.add(new Option(t, t));
  });

  const form = document.getElementById("article-form");
  if (form) {
    form.addEventListener("submit", handleArticleSubmit);
  }
}
