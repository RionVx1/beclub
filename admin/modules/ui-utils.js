// UI utilities module
// Handles UI interactions, tab switching, and common UI patterns

/**
 * Initialize the action view tabs used in the admin panel.
 * Binds `.action-btn` to switch panels with matching `.action-panel`.
 */
export function initActionView() {
  const buttons = Array.from(
    document.querySelectorAll(".action-btn"),
  );
  const panels = Array.from(
    document.querySelectorAll(".action-panel"),
  );

  function setActive(action) {
    buttons.forEach((btn) => {
      const isActive = btn.dataset.action === action;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute(
        "aria-selected",
        isActive ? "true" : "false",
      );
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === action;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActive(btn.dataset.action);
    });
  });

  setActive("articles");
}

/**
 * Wire the visible upload button to the hidden file input.
 * Clicking `#btn-upload` triggers `#article-file` click.
 */
export function setupUploadButton() {
  const btn = document.getElementById("btn-upload");
  const input = document.getElementById("article-file");
  if (!btn || !input) return;
  btn.addEventListener("click", () => input.click());
}

/**
 * Display status messages for the preview backfill workflow.
 * @param {string} message - text to display
 * @param {string} type - CSS class for status (e.g. 'uploading', 'success', 'error')
 */
export function showPreviewBackfillStatus(message, type) {
  const el = document.getElementById("preview-backfill-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `upload-status ${type}`;
}
