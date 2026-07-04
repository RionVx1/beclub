/**
 * Article Management Module
 * Handles uploading and removing articles from GitHub
 */

function showStatus(message, type) {
  const el = document.getElementById("upload-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status ${type}`;
}

function showPreviewBackfillStatus(message, type) {
  const el = document.getElementById("preview-backfill-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status ${type}`;
}

function isSafePdfFilename(fileName) {
  return (
    typeof fileName === "string" &&
    /\.pdf$/i.test(fileName) &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !fileName.includes("..")
  );
}

async function fetchArticlePdfBuffer(fileName) {
  if (!isSafePdfFilename(fileName)) {
    throw new Error(`Invalid PDF file name: ${fileName}`);
  }

  const res = await fetch(`../Articles/${encodeURIComponent(fileName)}`);
  if (!res.ok) {
    throw new Error(`Could not fetch PDF (${res.status})`);
  }
  return res.arrayBuffer();
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

function escapeSvgAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function generatePreviewSvgFromPdfBuffer(pdfBuffer) {
  if (typeof pdfjsLib === "undefined") {
    throw new Error("PDF preview engine is not loaded in admin panel.");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
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
}

async function loadManifest() {
  try {
    const res = await fetch("../Articles/articles.json");
    if (!res.ok) return { articles: [] };
    const data = await res.json();
    return { articles: Array.isArray(data?.articles) ? data.articles : [] };
  } catch (err) {
    console.error("Failed to load articles manifest:", err);
    return { articles: [] };
  }
}

function fieldLabel(value) {
  const FIELDS = [
    { value: "red-biotech", label: "Red Biotechnology" },
    { value: "green-biotech", label: "Green Biotechnology" },
    { value: "white-biotech", label: "White Biotechnology" },
    { value: "it", label: "Information Technology" },
    { value: "general", label: "General" },
  ];
  return FIELDS.find((f) => f.value === value)?.label || value;
}

function renderArticleList(articles) {
  const listEl = document.getElementById("file-list");
  if (!listEl) return;

  if (!articles || !articles.length) {
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
          <span class="file-meta">${fieldLabel(a.field)} \u00b7 ${a.tag} \u00b7 Articles/${a.file}</span>
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

async function handleArticleSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    showStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const title = document.getElementById("article-title").value.trim();
  const desc = document.getElementById("article-desc").value.trim();
  const tag = document.getElementById("article-tag").value;
  const field = document.getElementById("article-field").value;
  const fileInput = document.getElementById("article-file");
  const file = fileInput.files[0];

  if (!file) {
    showStatus("Please select a PDF article file.", "error");
    return;
  }

  // Enforce file type
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showStatus("Articles must be PDF files.", "error");
    return;
  }

  // Enforce max file size: 1 MB
  const MAX_ARTICLE_SIZE = 1 * 1024 * 1024; // bytes
  if (file.size > MAX_ARTICLE_SIZE) {
    showStatus(
      "Selected file is too large. Maximum size is 1 MB per file.",
      "error",
    );
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  showStatus(`Uploading ${file.name} to Articles/\u2026`, "uploading");

  try {
    const content = await readFileAsArrayBuffer(file);
    const manifest = await loadManifest();
    const slug = slugify(title);
    const filename = file.name.toLowerCase().includes(slug)
      ? file.name
      : `${slug}.pdf`;

    showStatus("Generating SVG preview from page 1\u2026", "uploading");
    const previewSvgContent = await generatePreviewSvgFromPdfBuffer(content);

    const entry = {
      id: slug,
      title,
      desc,
      tag,
      field,
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
      title,
    );

    showStatus(
      `Published! "${title}" PDF, preview SVG, and articles.json were updated.`,
      "success",
    );
    e.target.reset();
    // keep github-token for convenience
    renderArticleList(manifest.articles);
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function removeArticle(id) {
  const token = getGithubToken();
  if (!token) {
    showStatus("Enter your GitHub token to remove articles.", "error");
    return;
  }

  const manifest = await loadManifest();
  const article = manifest.articles.find((a) => a.id === id);
  if (!article) return;

  if (!confirm(`Remove "${article.title}" from the site?`)) return;

  showStatus("Removing article\u2026", "uploading");

  try {
    manifest.articles = manifest.articles.filter((a) => a.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await removeArticleFromGithub(
      token,
      article.file,
      manifestJson,
      article.title,
    );
    showStatus(`Removed "${article.title}".`, "success");
    // keep token available for further actions
    renderArticleList(manifest.articles);
  } catch (err) {
    showStatus(err.message, "error");
  }
}

async function handleBackfillPreviews() {
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
