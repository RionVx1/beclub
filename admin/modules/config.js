// Configuration constants for admin panel

export const MANIFEST_PATH = "../Articles/articles.json";
export const EPISODES_MANIFEST_PATH = "../Articles/episodes.json";
export const EVENTS_MANIFEST_PATH = "../Articles/events.json";
export const REGISTRATION_MANIFEST_PATH = "../Articles/registration.json";

export const FIELDS = [
  { value: "red-biotech", label: "Red Biotechnology" },
  { value: "green-biotech", label: "Green Biotechnology" },
  { value: "white-biotech", label: "White Biotechnology" },
  { value: "it", label: "Information Technology" },
  { value: "general", label: "General" },
];

export const TAGS = ["Beginner", "Intermediate", "Deep Dive", "External"];

export const MAX_ARTICLE_SIZE = 1 * 1024 * 1024; // 1 MB in bytes
