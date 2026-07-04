/**
 * Episodes (Podcasts) Management Module
 * Handles uploading and removing podcast episodes from GitHub
 */

function showPodcastStatus(message, type) {
  const el = document.getElementById("podcast-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status podcast-status ${type}`;
}

async function loadEpisodesManifest() {
  const res = await fetch("../Articles/episodes.json");
  if (!res.ok) return { episodes: [] };
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

async function handleEpisodeSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    showPodcastStatus("Enter your GitHub token to upload.", "error");
    return;
  }

  const title = document.getElementById("podcast-title").value.trim();
  const episode = document.getElementById("podcast-episode").value.trim();
  const date = document.getElementById("podcast-date").value;
  const desc = document.getElementById("podcast-desc").value.trim();
  const link = document.getElementById("podcast-link").value.trim();

  if (!title || !link) {
    showPodcastStatus("Episode title and link are required.", "error");
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
    renderEpisodeList(manifest.episodes);
  } catch (err) {
    showPodcastStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
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
