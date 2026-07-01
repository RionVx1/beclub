const USER_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const PASS_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_TOKEN_VALUE =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_KEY = "beclub_admin_token";
const MANIFEST_PATH = "../Articles/articles.json";
const EPISODES_MANIFEST_PATH = "../Articles/episodes.json";
const EVENTS_MANIFEST_PATH = "../Articles/events.json";

const FIELDS = [
  { value: "red-biotech", label: "Red Biotechnology" },
  { value: "green-biotech", label: "Green Biotechnology" },
  { value: "white-biotech", label: "White Biotechnology" },
  { value: "it", label: "Information Technology" },
  { value: "general", label: "General" },
];

const TAGS = ["Beginner", "Intermediate", "Deep Dive", "External"];

async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getToken() {
  return sessionStorage.getItem(AUTH_KEY);
}

function setToken(hash) {
  sessionStorage.setItem(AUTH_KEY, hash);
}

function clearToken() {
  sessionStorage.removeItem(AUTH_KEY);
}

function isLoggedIn() {
  return getToken() === AUTH_TOKEN_VALUE;
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");

  const userHash = await sha256(user);
  const passHash = await sha256(pass);

  if (userHash === USER_HASH && passHash === PASS_HASH) {
    setToken(AUTH_TOKEN_VALUE);
    window.location.href = "panel.html";
    return;
  }

  errorEl.textContent = "Invalid username or password.";
  errorEl.hidden = false;
}

function logout() {
  clearToken();
  window.location.href = "login.html";
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadManifest() {
  const res = await fetch(MANIFEST_PATH);
  if (!res.ok) return { articles: [] };
  return res.json();
}

async function loadEpisodesManifest() {
  const res = await fetch(EPISODES_MANIFEST_PATH);
  if (!res.ok) return { episodes: [] };
  return res.json();
}

async function loadEventsManifest() {
  const res = await fetch(EVENTS_MANIFEST_PATH);
  if (!res.ok) return { events: [] };
  return res.json();
}

async function uploadEpisodesManifest(token, manifestContent, title) {
  const manifestPath = `${GITHUB_CONFIG.articlesDir}/episodes.json`;
  await uploadToGithub(
    token,
    manifestPath,
    manifestContent,
    `Update episodes list: ${title}`,
  );
}

async function uploadEventsManifest(token, manifestContent, title) {
  const manifestPath = `${GITHUB_CONFIG.articlesDir}/events.json`;
  await uploadToGithub(
    token,
    manifestPath,
    manifestContent,
    `Update events list: ${title}`,
  );
}

async function handleEpisodeSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    showStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const title = document.getElementById("podcast-title").value.trim();
  const episode = document.getElementById("podcast-episode").value.trim();
  const date = document.getElementById("podcast-date").value;
  const desc = document.getElementById("podcast-desc").value.trim();
  const link = document.getElementById("podcast-link").value.trim();

  if (!title || !link) {
    showStatus("Episode title and link are required.", "error");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  showPodcastStatus(`Saving episode "${title}" to episodes.json…`, "uploading");

  try {
    const manifest = await loadEpisodesManifest();
    const slug = slugify(title);

    const entry = {
      id: slug,
      title,
      episode: episode ? Number(episode) : null,
      date: date || new Date().toISOString().slice(0, 10),
      desc,
      link,
    };

    const existing = manifest.episodes.findIndex(
      (item) => item.id === slug || item.link === link,
    );
    if (existing >= 0) {
      manifest.episodes[existing] = entry;
    } else {
      manifest.episodes.push(entry);
    }

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEpisodesManifest(token, manifestJson, title);

    showPodcastStatus(
      `Saved! "${title}" was added to episodes.json.`,
      "success",
    );
    e.target.reset();
    // keep github-token so admin can perform further actions without re-entering
  } catch (err) {
    showPodcastStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function showEventStatus(message, type) {
  const el = document.getElementById("event-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status event-status ${type}`;
}

async function handleEventSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    showEventStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const title = document.getElementById("event-title").value.trim();
  const date = document.getElementById("event-date").value;
  const desc = document.getElementById("event-desc").value.trim();

  if (!title || !date || !desc) {
    showEventStatus("Event name, date, and description are required.", "error");
    return;
  }

  const eventDate = new Date(date);
  if (Number.isNaN(eventDate.getTime())) {
    showEventStatus("Invalid event date.", "error");
    return;
  }

  const day = String(eventDate.getDate()).padStart(2, "0");
  const monthYear = `${
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][eventDate.getMonth()]
  } ${eventDate.getFullYear()}`;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  showEventStatus(`Saving event "${title}" to events.json…`, "uploading");

  try {
    const manifest = await loadEventsManifest();
    const slug = slugify(title);

    const entry = {
      id: slug,
      title,
      date,
      day,
      monthYear,
      description: desc,
    };

    const existing = manifest.events.findIndex((item) => item.id === slug);
    if (existing >= 0) {
      manifest.events[existing] = entry;
    } else {
      manifest.events.push(entry);
    }

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEventsManifest(token, manifestJson, title);

    showEventStatus(`Saved! "${title}" was added to events.json.`, "success");
    e.target.reset();
    // keep github-token so admin can perform further actions without re-entering
  } catch (err) {
    showEventStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

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

function renderEpisodeList(episodes) {
  const listEl = document.getElementById("episode-list");
  if (!listEl) return;

  if (!episodes.length) {
    listEl.innerHTML =
      '<p class="file-empty">No episodes in Articles/ yet.</p>';
    return;
  }

  listEl.innerHTML = episodes
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(
      (item) => `
      <div class="file-item">
        <div class="file-info">
          <span class="file-name">${item.title}</span>
          <span class="file-meta">Episode ${item.episode || "—"} · ${item.date}</span>
          <span class="file-meta">${item.desc || ""}</span>
        </div>
        <div class="file-actions">
          ${item.link ? `<a href="${item.link}" class="file-link" target="_blank">Open</a>` : ""}
          <button class="file-remove" data-id="${item.id}" data-type="episode">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  listEl.querySelectorAll(".file-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeEpisode(btn.dataset.id));
  });
}

function renderEventList(events) {
  const listEl = document.getElementById("event-list");
  if (!listEl) return;

  if (!events.length) {
    listEl.innerHTML = '<p class="file-empty">No events in Articles/ yet.</p>';
    return;
  }

  listEl.innerHTML = events
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(
      (item) => `
      <div class="file-item">
        <div class="file-info">
          <span class="file-name">${item.title}</span>
          <span class="file-meta">${item.date}</span>
          <span class="file-meta">${item.description || ""}</span>
        </div>
        <div class="file-actions">
          <button class="file-remove" data-id="${item.id}" data-type="event">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  listEl.querySelectorAll(".file-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeEvent(btn.dataset.id));
  });
}

async function removeEpisode(id) {
  const token = getGithubToken();
  if (!token) {
    showPodcastStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const manifest = await loadEpisodesManifest();
  const episode = manifest.episodes.find((item) => item.id === id);
  if (!episode) return;

  if (!confirm(`Remove episode "${episode.title}" from episodes.json?`)) return;

  showPodcastStatus("Removing episode…", "uploading");
  try {
    manifest.episodes = manifest.episodes.filter((item) => item.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEpisodesManifest(token, manifestJson, episode.title);
    showPodcastStatus(`Removed "${episode.title}".`, "success");
    // keep the token in place so admin can continue to remove or add without re-entering
    renderEpisodeList(manifest.episodes);
  } catch (err) {
    showPodcastStatus(err.message, "error");
  }
}

async function removeEvent(id) {
  const token = getGithubToken();
  if (!token) {
    showEventStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const manifest = await loadEventsManifest();
  const eventItem = manifest.events.find((item) => item.id === id);
  if (!eventItem) return;

  // Find the button(s) for this id so we can disable while working
  const buttons = Array.from(
    document.querySelectorAll(
      `.file-remove[data-id="${id}"][data-type="event"]`,
    ),
  );

  if (!confirm(`Remove event "${eventItem.title}" from events.json?`)) return;

  // Disable any matching buttons
  buttons.forEach((b) => {
    b.disabled = true;
  });
  showEventStatus("Removing event…", "uploading");
  try {
    manifest.events = manifest.events.filter((item) => item.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEventsManifest(token, manifestJson, eventItem.title);
    showEventStatus(`Removed "${eventItem.title}".`, "success");
    // don't clear token here; keep for convenience
    renderEventList(manifest.events);
  } catch (err) {
    showEventStatus(err.message, "error");
  } finally {
    // re-enable buttons
    buttons.forEach((b) => {
      b.disabled = false;
    });
  }
}

function showPodcastStatus(message, type) {
  const el = document.getElementById("podcast-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status podcast-status ${type}`;
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

function previewFilenameFromPdf(pdfFileName) {
  return pdfFileName.replace(/\.pdf$/i, ".svg");
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

function getGithubToken() {
  const input = document.getElementById("github-token");
  return input ? input.value.trim() : "";
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
  showStatus(`Uploading ${file.name} to Articles/…`, "uploading");

  try {
    const content = await readFileAsArrayBuffer(file);
    const manifest = await loadManifest();
    const slug = slugify(title);
    const filename = file.name.toLowerCase().includes(slug)
      ? file.name
      : `${slug}.pdf`;

    showStatus("Generating SVG preview from page 1…", "uploading");
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

  showStatus("Removing article…", "uploading");

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

function fieldLabel(value) {
  return FIELDS.find((f) => f.value === value)?.label || value;
}

function renderArticleList(articles) {
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
          <span class="file-meta">${fieldLabel(a.field)} · ${a.tag} · Articles/${a.file}</span>
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

function showRegistrationStatus(message, type) {
  const el = document.getElementById("registration-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status registration-status ${type}`;
}

async function handleRegistrationSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    showRegistrationStatus("Enter your GitHub token to save settings.", "error");
    return;
  }

  const toggle = document.getElementById("registration-toggle");
  const link = document.getElementById("registration-link").value.trim();
  const registrationEnabled = toggle.checked;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  showRegistrationStatus("Saving registration settings…", "uploading");

  try {
    const manifest = await loadEventsManifest();
    manifest.registration = registrationEnabled;
    manifest.forumLink = link || null;

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEventsManifest(token, manifestJson, "Update registration settings");

    showRegistrationStatus("Registration settings saved!", "success");
  } catch (err) {
    showRegistrationStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function loadRegistrationSettings() {
  try {
    const manifest = await loadEventsManifest();
    const toggle = document.getElementById("registration-toggle");
    const link = document.getElementById("registration-link");
    const statusText = document.getElementById("registration-status-text");

    if (toggle) {
      toggle.checked = manifest.registration === true;
    }
    if (link) {
      link.value = manifest.forumLink || "";
    }
    if (statusText) {
      statusText.textContent = manifest.registration === true ? "Open" : "Closed";
    }

    // Update status text when toggle changes
    if (toggle && statusText) {
      toggle.addEventListener("change", () => {
        statusText.textContent = toggle.checked ? "Open" : "Closed";
      });
    }
  } catch (err) {
    console.error("Failed to load registration settings:", err);
  }
}

async function initPanel() {
  const fieldSelect = document.getElementById("article-field");
  const tagSelect = document.getElementById("article-tag");

  FIELDS.forEach((f) => {
    fieldSelect.add(new Option(f.label, f.value));
  });
  TAGS.forEach((t) => {
    tagSelect.add(new Option(t, t));
  });

  document
    .getElementById("article-form")
    .addEventListener("submit", handleArticleSubmit);
  const podcastForm = document.getElementById("podcast-form");
  if (podcastForm) {
    podcastForm.addEventListener("submit", handleEpisodeSubmit);
  }

  const eventForm = document.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", handleEventSubmit);
  }

  const registrationForm = document.getElementById("registration-form");
  if (registrationForm) {
    registrationForm.addEventListener("submit", handleRegistrationSubmit);
  }

  const backfillBtn = document.getElementById("backfill-previews-btn");
  if (backfillBtn) {
    backfillBtn.addEventListener("click", handleBackfillPreviews);
  }

  const [manifest, episodesManifest, eventsManifest] = await Promise.all([
    loadManifest(),
    loadEpisodesManifest(),
    loadEventsManifest(),
  ]);

  renderArticleList(manifest.articles);
  renderEpisodeList(episodesManifest.episodes);
  renderEventList(eventsManifest.events);
  loadRegistrationSettings();
}

function setupUploadButton() {
  const btn = document.getElementById("btn-upload");
  const input = document.getElementById("article-file");
  if (!btn || !input) return;
  btn.addEventListener("click", () => input.click());
}
