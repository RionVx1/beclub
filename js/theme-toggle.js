const THEME_KEY = 'beclub_theme';

function getSavedTheme() {
  return window.localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;
  if (theme === 'light') {
    button.innerHTML = '🌙';
  } else {
    button.innerHTML = '🔆';
  }
}

function toggleTheme() {
  const current = document.body.dataset.theme === 'light' ? 'light' : 'dark';
  setTheme(current === 'light' ? 'dark' : 'light');
}

function initThemeToggle() {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;

  button.addEventListener('click', toggleTheme);
  updateThemeButton(document.body.dataset.theme);
}

function initTheme() {
  const theme = getSavedTheme();
  document.body.dataset.theme = theme;
  initThemeToggle();
}

document.addEventListener('DOMContentLoaded', initTheme);
