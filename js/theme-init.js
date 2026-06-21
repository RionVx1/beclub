(function initThemeFromStorage() {
  try {
    // Read central theme value from localStorage and apply it immediately so
    // the page paints with the correct theme (avoid flash-of-incorrect-theme).
    var t = localStorage.getItem("beclub_theme");
    if (t) {
      // Set on documentElement (html) so it takes effect even before <body> exists
      try {
        document.documentElement.dataset.theme = t;
      } catch (e) {}
      if (document.body) document.body.dataset.theme = t;
      else {
        // If body doesn't exist yet, apply when DOM is ready
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            document.body.dataset.theme = t;
          },
          { once: true },
        );
      }
    }

    // Keep pages in sync: apply updates when other tabs/windows change the key
    window.addEventListener("storage", function (e) {
      if (e.key === "beclub_theme" && e.newValue) {
        try {
          document.documentElement.dataset.theme = e.newValue;
        } catch (e) {}
        if (document.body) document.body.dataset.theme = e.newValue;
      }
    });
  } catch (err) {
    // Fail silently — theme will default to CSS/HTML-defined value
    console.error("theme-init error", err);
  }
})();
