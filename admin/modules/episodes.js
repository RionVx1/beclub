// Episodes (podcasts) management module
// Handles podcast episode upload, removal, and listing

/**
 * Manages episodes.json: add/remove episodes and render episode list UI.
 */

import { slugify, setStatus } from "./utils.js";
import { uploadToGithub, getGithubToken } from "./github-api.js";
import { loadEpisodesManifest } from "./data-loader.js";
import { validateEpisodeData, showValidationErrors } from "./validation.js";

// use shared setStatus for podcast-status

async function uploadEpisodesManifest(token, manifestContent, title) {
  const manifestPath = `Articles/episodes.json`;
  await uploadToGithub(
    token,
    manifestPath,
    manifestContent,
    `Update episodes list: ${title}`,
  );
}

/**
 * Handle the podcast episode form submission: validate, update `episodes.json`, and upload.
 */
export async function handleEpisodeSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    setStatus("podcast-status", "Enter your GitHub token to upload.", "error", "podcast-status");
    return;
  }

  const title = document.getElementById("podcast-title").value.trim();
  const episode = document.getElementById("podcast-episode").value.trim();
  const date = document.getElementById("podcast-date").value;
  const desc = document.getElementById("podcast-desc").value.trim();
  const link = document.getElementById("podcast-link").value.trim();

  // Validate and sanitize input
  const validation = validateEpisodeData({
    title,
    episode,
    date,
    description: desc,
    link,
  });

  if (!validation.valid) {
    showValidationErrors(
      validation.errors,
      "podcast-status",
      (m, t) => setStatus("podcast-status", m, t, "podcast-status"),
    );
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  setStatus("podcast-status", `Saving episode "${validation.sanitized.title}" to episodes.json…`, "uploading", "podcast-status");

  try {
    const manifest = await loadEpisodesManifest();
    const slug = slugify(validation.sanitized.title);

    const entry = {
      id: slug,
      title: validation.sanitized.title,
      episode: validation.sanitized.episode,
      date: validation.sanitized.date || new Date().toISOString().slice(0, 10),
      desc: validation.sanitized.description,
      link: validation.sanitized.link,
    };

    const existing = manifest.episodes.findIndex(
      (item) => item.id === slug || item.link === validation.sanitized.link,
    );
    if (existing >= 0) {
      manifest.episodes[existing] = entry;
    } else {
      manifest.episodes.push(entry);
    }

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEpisodesManifest(token, manifestJson, validation.sanitized.title);

    setStatus(
      "podcast-status",
      `Saved! "${validation.sanitized.title}" was added to episodes.json.`,
      "success",
      "podcast-status",
    );
    e.target.reset();
    renderEpisodeList(manifest.episodes);
  } catch (err) {
    setStatus("podcast-status", err.message, "error", "podcast-status");
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Remove an episode by id after user confirmation and update the manifest on GitHub.
 */
export async function removeEpisode(id) {
  const token = getGithubToken();
  if (!token) {
    setStatus("podcast-status", "Enter your GitHub token to upload.", "error", "podcast-status");
    return;
  }

  const manifest = await loadEpisodesManifest();
  const episode = manifest.episodes.find((item) => item.id === id);
  if (!episode) return;

  if (!confirm(`Remove episode "${episode.title}" from episodes.json?`)) return;

  setStatus("podcast-status", "Removing episode…", "uploading", "podcast-status");
  try {
    manifest.episodes = manifest.episodes.filter((item) => item.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEpisodesManifest(token, manifestJson, episode.title);
    setStatus("podcast-status", `Removed "${episode.title}".`, "success", "podcast-status");
    renderEpisodeList(manifest.episodes);
  } catch (err) {
    setStatus("podcast-status", err.message, "error", "podcast-status");
  }
}

/**
 * Render the episodes list into `#episode-list` and wire remove buttons.
 */
export function renderEpisodeList(episodes) {
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

/**
 * Initialize the podcast form submit handler.
 */
export function initEpisodeForm() {
  const form = document.getElementById("podcast-form");
  if (form) {
    form.addEventListener("submit", handleEpisodeSubmit);
  }
}
