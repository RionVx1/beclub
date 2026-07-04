/**
 * Registration Management Module
 * Handles registration settings and updates
 */

function showRegistrationStatus(message, type) {
  const el = document.getElementById("registration-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status registration-status ${type}`;
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
