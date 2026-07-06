// Authentication module for admin panel
// Handles login, logout, session management, and password hashing

const USER_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const PASS_HASH =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_TOKEN_VALUE =
  "32801f5c6ca59882d004c3b927de38fa22fa1ed71e0f63d66707f000f2587eac";
const AUTH_KEY = "beclub_admin_token";

/**
 * Compute the SHA-256 hash of a string (returns hex string).
 * Uses Web Crypto `subtle.digest`.
 */
export async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Session token helpers stored in sessionStorage */
export function getToken() {
  return sessionStorage.getItem(AUTH_KEY);
}

export function setToken(hash) {
  sessionStorage.setItem(AUTH_KEY, hash);
}

export function clearToken() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn() {
  return getToken() === AUTH_TOKEN_VALUE;
}

/**
 * Simple guard used on admin pages to redirect to login if not authenticated.
 * Returns `false` after redirecting, `true` when auth present.
 */
export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/**
 * Handle login form submission: hash username/password and compare to
 * fixed hashes. On success, store a session token and redirect to `panel.html`.
 */
export async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");

  const userHash = await sha256(user);
  const passHash = await sha256(pass);

  if (userHash === USER_HASH && passHash === PASS_HASH) {
    setToken(AUTH_TOKEN_VALUE);
    window.location.href = "panel.html";
    return;
  }

  errorEl.textContent = "Invalid username or password.";
  errorEl.hidden = false;
}

export function logout() {
  clearToken();
  window.location.href = "login.html";
}
