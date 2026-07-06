// Admin panel main entry point
// This file imports and initializes all the modularized admin functionality

import { requireAuth, logout } from "./modules/auth.js";
import { initActionView, setupUploadButton } from "./modules/ui-utils.js";
import { 
  initArticleForm, 
  renderArticleList 
} from "./modules/articles.js";
import { 
  initEpisodeForm, 
  renderEpisodeList 
} from "./modules/episodes.js";
import { 
  initEventForm, 
  renderEventList, 
  loadRegistrationSettings 
} from "./modules/events.js";
import { 
  handleBackfillPreviews 
} from "./modules/backfill.js";
import { 
  loadManifest, 
  loadEpisodesManifest, 
  loadEventsManifest 
} from "./modules/data-loader.js";

async function initPanel() {
  // Initialize all forms
  initArticleForm();
  initEpisodeForm();
  initEventForm();

  // Load and render all data
  const [manifest, episodesManifest, eventsManifest] = await Promise.all([
    loadManifest(),
    loadEpisodesManifest(),
    loadEventsManifest(),
  ]);

  renderArticleList(manifest.articles);
  renderEpisodeList(episodesManifest.episodes);
  renderEventList(eventsManifest.events);
  loadRegistrationSettings();

  // Setup backfill button if present
  const backfillBtn = document.getElementById("backfill-previews-btn");
  if (backfillBtn) {
    backfillBtn.addEventListener("click", handleBackfillPreviews);
  }
}

// Initialize the admin panel
if (!requireAuth()) {
  throw new Error("redirecting");
}

document.getElementById("logout-btn").addEventListener("click", logout);
setupUploadButton();
initActionView();
initPanel();
