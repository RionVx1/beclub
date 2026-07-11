// Data loading module
// Handles loading JSON manifests and article PDFs from the Articles directory

import { MANIFEST_PATH, EPISODES_MANIFEST_PATH, EVENTS_MANIFEST_PATH, REGISTRATION_MANIFEST_PATH } from "./config.js";

/**
 * Load the main articles manifest JSON (`articles.json`).
 * Returns `{ articles: [] }` on failure to keep callers simple.
 */
export async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_PATH);
    if (!res.ok) return { articles: [] };
    return await res.json();
  } catch (err) {
    console.error("Failed to load articles manifest:", err);
    return { articles: [] };
  }
}

/**
 * Load the episodes manifest (`episodes.json`). Returns `{ episodes: [] }` on failure.
 */
export async function loadEpisodesManifest() {
  try {
    const res = await fetch(EPISODES_MANIFEST_PATH);
    if (!res.ok) return { episodes: [] };
    return await res.json();
  } catch (err) {
    console.error("Failed to load episodes manifest:", err);
    return { episodes: [] };
  }
}

/**
 * Load the events manifest (`events.json`). Returns `{ events: [] }` on failure.
 */
export async function loadEventsManifest() {
  try {
    const res = await fetch(EVENTS_MANIFEST_PATH);
    if (!res.ok) return { events: [] };
    return await res.json();
  } catch (err) {
    console.error("Failed to load events manifest:", err);
    return { events: [] };
  }
}

/**
 * Load the registration manifest (`registration.json`). Returns { registration: false, forumLink: null } on failure.
 */
export async function loadRegistrationManifest() {
  try {
    const res = await fetch(REGISTRATION_MANIFEST_PATH);
    if (!res.ok) return { registration: false, forumLink: null };
    return await res.json();
  } catch (err) {
    console.error("Failed to load registration manifest:", err);
    return { registration: false, forumLink: null };
  }
}

/**
 * Fetch the binary contents of a PDF article as an ArrayBuffer.
 * Throws on HTTP or network errors.
 */
export async function fetchArticlePdfBuffer(fileName) {
  try {
    const res = await fetch(`../Articles/${encodeURIComponent(fileName)}`);
    if (!res.ok) {
      throw new Error(`Could not fetch PDF (${res.status})`);
    }
    return await res.arrayBuffer();
  } catch (err) {
    console.error(`Failed to fetch PDF ${fileName}:`, err);
    throw err;
  }
}
