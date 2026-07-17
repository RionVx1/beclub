// Theme toggle: per-tab persistence (sessionStorage) + same-tab synchronization via BroadcastChannel

// Theme toggle: cross-tab + per-tab sync using localStorage + BroadcastChannel

const THEME_KEY = "beclub_theme";
const CHANNEL_NAME = "beclub_theme_channel";

const bc =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

function getSavedTheme() {
  // Prefer localStorage (cross-tab), fall back to body data-theme or 'dark'
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v) return v;
  } catch (e) {
    /* ignore */
  }
  return document.body.dataset.theme === "light" ? "light" : "dark";
}

let __themeTransitionTimer = null;
function setTheme(theme, broadcast = true) {
  // Add a short class to enable smooth CSS transitions
  // apply to both html and body if present
  try {
    document.documentElement.classList.add("theme-transition");
    if (document.body) document.body.classList.add("theme-transition");
  } catch (e) {}
  if (__themeTransitionTimer) clearTimeout(__themeTransitionTimer);
  __themeTransitionTimer = setTimeout(() => {
    try {
      document.documentElement.classList.remove("theme-transition");
      if (document.body) document.body.classList.remove("theme-transition");
    } catch (e) {}
    __themeTransitionTimer = null;
  }, 620);

  // Set theme on both documentElement and body (body may not exist early)
  try {
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
  if (document.body) document.body.dataset.theme = theme;
  else {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        document.body.dataset.theme = theme;
      },
      { once: true },
    );
  }

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* ignore */
  }
  updateThemeButton(theme);
  // Notify other same-origin contexts using BroadcastChannel if available
  if (broadcast && bc) bc.postMessage({ theme });
}

function updateThemeButton(theme) {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;
  const isLight = theme === "light";
  button.innerHTML = isLight
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.4 14.8A8.5 8.5 0 0 1 9.2 3.6 8.5 8.5 0 1 0 20.4 14.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  button.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
  button.setAttribute("title", isLight ? "Switch to dark theme" : "Switch to light theme");
}

function toggleTheme() {
  const current = document.body.dataset.theme === "light" ? "light" : "dark";
  setTheme(current === "light" ? "dark" : "light");
}

function initThemeToggle() {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;

  button.addEventListener("click", toggleTheme);
  updateThemeButton(document.body.dataset.theme || getSavedTheme());
}

function initTheme() {
  // Initialize theme from localStorage (cross-tab persistence)
  const theme = getSavedTheme();
  document.body.dataset.theme = theme;
  initThemeToggle();

  // Listen for BroadcastChannel messages (fast same-tab sync)
  if (bc) {
    bc.onmessage = (ev) => {
      if (ev && ev.data && ev.data.theme) setTheme(ev.data.theme, false);
    };
  }

  // Fallback: listen for storage events (localStorage) to sync across tabs
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY && e.newValue) setTheme(e.newValue, false);
  });
}

function initScrollReveal() {
  const targets = document.querySelectorAll(
    ".section, .hero-left, .hero-right, .overview-main, .key-point, .article-card, .event, .mission-card, .follow-card, .contact-box, .card, .join",
  );

  const shouldSkipReveal =
    window.matchMedia("(max-width: 860px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  targets.forEach((el) => {
    el.classList.add("reveal");
    if (shouldSkipReveal) el.classList.add("active");
  });

  if (shouldSkipReveal) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: "0px 0px -40px 0px",
    },
  );

  targets.forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initScrollReveal();
});
