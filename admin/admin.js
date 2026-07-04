const USER_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const PASS_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_TOKEN_VALUE =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_KEY = "beclub_admin_token";

const FIELDS = [
  { value: "red-biotech", label: "Red Biotechnology" },
  { value: "green-biotech", label: "Green Biotechnology" },
  { value: "white-biotech", label: "White Biotechnology" },
  { value: "it", label: "Information Technology" },
  { value: "general", label: "General" },
];

const TAGS = ["Beginner", "Intermediate", "Deep Dive", "External"];

// ============================================================================
// AUTHENTICATION
// ============================================================================

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

// ============================================================================
// UTILITIES
// ============================================================================

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getGithubToken() {
  const input = document.getElementById("github-token");
  return input ? input.value.trim() : "";
}

function setupUploadButton() {
  const btn = document.getElementById("btn-upload");
  const input = document.getElementById("article-file");
  if (!btn || !input) return;
  btn.addEventListener("click", () => input.click());
}

// ============================================================================
// PANEL INITIALIZATION
// ============================================================================

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
