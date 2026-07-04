/**
 * Events Management Module
 * Handles uploading and removing events from GitHub
 */

function showEventStatus(message, type) {
  const el = document.getElementById("event-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status event-status ${type}`;
}

async function loadEventsManifest() {
  const res = await fetch("../Articles/events.json");
  if (!res.ok) return { events: [] };
  return res.json();
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
    renderEventList(manifest.events);
  } catch (err) {
    showEventStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
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
