// Events management module
// Handles event upload, removal, listing, and registration settings

/**
 * Manages events.json: add/remove events, change registration settings,
 * and render event list UI.
 */

import { slugify, setStatus } from "./utils.js";
import { uploadToGithub, getGithubToken } from "./github-api.js";
import { loadEventsManifest, loadRegistrationManifest } from "./data-loader.js";
import { validateEventData, showValidationErrors } from "./validation.js";

// use shared setStatus for event-status

async function uploadEventsManifest(token, manifestContent, title) {
  const manifestPath = `Articles/events.json`;
  await uploadToGithub(
    token,
    manifestPath,
    manifestContent,
    `Update events list: ${title}`,
  );
}

async function uploadRegistrationManifest(token, manifestContent, title) {
  const manifestPath = `Articles/registration.json`;
  await uploadToGithub(
    token,
    manifestPath,
    manifestContent,
    `Update registration settings: ${title}`,
  );
}

/**
 * Handle event form submissions: validate input, update `events.json`, and upload.
 */
export async function handleEventSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    setStatus("event-status", "Enter your GitHub token to upload.", "error", "event-status");
    return;
  }

  const title = document.getElementById("event-title").value.trim();
  const date = document.getElementById("event-date").value;
  const desc = document.getElementById("event-desc").value.trim();

  // Validate and sanitize input
  const validation = validateEventData({
    title,
    date,
    description: desc,
  });

  if (!validation.valid) {
    showValidationErrors(
      validation.errors,
      "event-status",
      (m, t) => setStatus("event-status", m, t, "event-status"),
    );
    return;
  }

  const eventDate = new Date(validation.sanitized.date);
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
  setStatus("event-status", `Saving event "${validation.sanitized.title}" to events.json…`, "uploading", "event-status");

  try {
    const manifest = await loadEventsManifest();
    const slug = slugify(validation.sanitized.title);

    const entry = {
      id: slug,
      title: validation.sanitized.title,
      date: validation.sanitized.date,
      day,
      monthYear,
      description: validation.sanitized.description,
    };

    const existing = manifest.events.findIndex((item) => item.id === slug);
    if (existing >= 0) {
      manifest.events[existing] = entry;
    } else {
      manifest.events.push(entry);
    }

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEventsManifest(token, manifestJson, validation.sanitized.title);

    setStatus("event-status", `Saved! "${validation.sanitized.title}" was added to events.json.`, "success", "event-status");
    e.target.reset();
    renderEventList(manifest.events);
  } catch (err) {
    setStatus("event-status", err.message, "error", "event-status");
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Remove an event from the manifest (with confirmation) and update GitHub.
 */
export async function removeEvent(id) {
  const token = getGithubToken();
  if (!token) {
    setStatus("event-status", "Enter your GitHub token to upload.", "error", "event-status");
    return;
  }

  const manifest = await loadEventsManifest();
  const eventItem = manifest.events.find((item) => item.id === id);
  if (!eventItem) return;

  if (!confirm(`Remove event "${eventItem.title}" from events.json?`)) return;

  setStatus("event-status", "Removing event…", "uploading", "event-status");
  try {
    manifest.events = manifest.events.filter((item) => item.id !== id);
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadEventsManifest(token, manifestJson, eventItem.title);
    setStatus("event-status", `Removed "${eventItem.title}".`, "success", "event-status");
    renderEventList(manifest.events);
  } catch (err) {
    setStatus("event-status", err.message, "error", "event-status");
  }
}

/**
 * Render the events into `#event-list` and attach remove handlers.
 */
export function renderEventList(events) {
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

// use shared setStatus for registration-status

/**
 * Display a simple status message for registration settings UI.
 */
export async function handleRegistrationSubmit(e) {
  e.preventDefault();

  const token = getGithubToken();
  if (!token) {
    setStatus("registration-status", "Enter your GitHub token to save settings.", "error", "registration-status");
    return;
  }

  const toggle = document.getElementById("registration-toggle");
  const link = document.getElementById("registration-link").value.trim();
  const registrationEnabled = toggle.checked;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  setStatus("registration-status", "Saving registration settings…", "uploading", "registration-status");

  try {
    // Save registration settings to Articles/registration.json
    const manifest = await loadRegistrationManifest();
    manifest.registration = registrationEnabled;
    manifest.forumLink = link || null;

    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    await uploadRegistrationManifest(token, manifestJson, "Update registration settings");

    setStatus("registration-status", "Registration settings saved!", "success", "registration-status");
  } catch (err) {
    setStatus("registration-status", err.message, "error", "registration-status");
  } finally {
    submitBtn.disabled = false;
  }
}

export async function loadRegistrationSettings() {
  try {
    const manifest = await loadRegistrationManifest();
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

    if (toggle && statusText) {
      toggle.addEventListener("change", () => {
        statusText.textContent = toggle.checked ? "Open" : "Closed";
      });
    }
  } catch (err) {
    console.error("Failed to load registration settings:", err);
  }
}

export function initEventForm() {
  const form = document.getElementById("event-form");
  if (form) {
    form.addEventListener("submit", handleEventSubmit);
  }

  const registrationForm = document.getElementById("registration-form");
  if (registrationForm) {
    registrationForm.addEventListener("submit", handleRegistrationSubmit);
  }
}
