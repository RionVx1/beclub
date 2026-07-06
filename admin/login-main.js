// Login page entry point
// This file handles authentication for the admin login page

import { isLoggedIn, handleLogin } from "./modules/auth.js";

if (isLoggedIn()) {
  window.location.href = "panel.html";
}

document.getElementById("login-form").addEventListener("submit", handleLogin);
