// Input validation and sanitization module
// Protects against malformed JSON, XSS, and user input errors

/**
 * Sanitizes multi-line text input to remove control characters,
 * normalize newlines, and limit excessive blank lines.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeTextInput(text) {
  if (typeof text !== 'string') return '';
  
  // Remove control characters except newlines and tabs
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize line endings to \n
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Limit consecutive newlines to prevent abuse
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitizes single-line text by removing newlines/tabs and
 * collapsing multiple spaces. Intended for titles/IDs.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeSingleLine(text) {
  if (typeof text !== 'string') return '';
  
  // Remove all newlines and tabs
  let sanitized = text.replace(/[\n\r\t]/g, ' ');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validates that a string is an http(s) URL.
 * @param {string} text
 * @returns {boolean}
 */
export function isValidUrl(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates a date string in YYYY-MM-DD format.
 * @param {string} text
 * @returns {boolean}
 */
export function isValidDate(text) {
  if (typeof text !== 'string') return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(text)) return false;
  
  const date = new Date(text);
  return !isNaN(date.getTime());
}

/**
 * Validate and sanitize an event payload. Returns `{ valid, errors, sanitized }`.
 * Used by the admin event form before saving to the manifest.
 */
export function validateEventData(data) {
  const errors = [];
  const sanitized = { ...data };
  
  // Validate title
  if (!sanitized.title || typeof sanitized.title !== 'string') {
    errors.push('Event title is required');
  } else {
    sanitized.title = sanitizeSingleLine(sanitized.title);
    if (sanitized.title.length === 0) {
      errors.push('Event title cannot be empty');
    } else if (sanitized.title.length > 200) {
      errors.push('Event title is too long (max 200 characters)');
    }
  }
  
  // Validate date
  if (!sanitized.date || !isValidDate(sanitized.date)) {
    errors.push('Valid date is required (YYYY-MM-DD format)');
  }
  
  // Validate description
  if (!sanitized.description || typeof sanitized.description !== 'string') {
    errors.push('Event description is required');
  } else {
    sanitized.description = sanitizeTextInput(sanitized.description);
    if (sanitized.description.length === 0) {
      errors.push('Event description cannot be empty');
    } else if (sanitized.description.length > 1000) {
      errors.push('Event description is too long (max 1000 characters)');
    }
  }
  
  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate and sanitize an episode payload. Returns `{ valid, errors, sanitized }`.
 */
export function validateEpisodeData(data) {
  const errors = [];
  const sanitized = { ...data };
  
  // Validate title
  if (!sanitized.title || typeof sanitized.title !== 'string') {
    errors.push('Episode title is required');
  } else {
    sanitized.title = sanitizeSingleLine(sanitized.title);
    if (sanitized.title.length === 0) {
      errors.push('Episode title cannot be empty');
    } else if (sanitized.title.length > 200) {
      errors.push('Episode title is too long (max 200 characters)');
    }
  }
  
  // Validate link
  if (!sanitized.link || typeof sanitized.link !== 'string') {
    errors.push('Episode link is required');
  } else if (!isValidUrl(sanitized.link)) {
    errors.push('Episode link must be a valid URL');
  }
  
  // Validate episode number (optional)
  if (sanitized.episode !== undefined && sanitized.episode !== null) {
    const episodeNum = parseInt(sanitized.episode, 10);
    if (isNaN(episodeNum) || episodeNum < 1) {
      errors.push('Episode number must be a positive integer');
    } else {
      sanitized.episode = episodeNum;
    }
  }
  
  // Validate date (optional)
  if (sanitized.date) {
    if (!isValidDate(sanitized.date)) {
      errors.push('Invalid date format (use YYYY-MM-DD)');
    }
  }
  
  // Validate description (optional)
  if (sanitized.description) {
    sanitized.description = sanitizeTextInput(sanitized.description);
    if (sanitized.description.length > 500) {
      errors.push('Episode description is too long (max 500 characters)');
    }
  }
  
  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate and sanitize an article payload. Returns `{ valid, errors, sanitized }`.
 */
export function validateArticleData(data) {
  const errors = [];
  const sanitized = { ...data };
  
  // Validate title
  if (!sanitized.title || typeof sanitized.title !== 'string') {
    errors.push('Article title is required');
  } else {
    sanitized.title = sanitizeSingleLine(sanitized.title);
    if (sanitized.title.length === 0) {
      errors.push('Article title cannot be empty');
    } else if (sanitized.title.length > 200) {
      errors.push('Article title is too long (max 200 characters)');
    }
  }
  
  // Validate description
  if (!sanitized.desc || typeof sanitized.desc !== 'string') {
    errors.push('Article description is required');
  } else {
    sanitized.desc = sanitizeSingleLine(sanitized.desc);
    if (sanitized.desc.length === 0) {
      errors.push('Article description cannot be empty');
    } else if (sanitized.desc.length > 300) {
      errors.push('Article description is too long (max 300 characters)');
    }
  }
  
  // Validate tag
  if (!sanitized.tag || typeof sanitized.tag !== 'string') {
    errors.push('Article tag is required');
  }
  
  // Validate field
  if (!sanitized.field || typeof sanitized.field !== 'string') {
    errors.push('Article field is required');
  }
  
  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Display validation errors using either a provided status function
 * or a fallback element ID. `statusFunction` signature: (message, type).
 */
export function showValidationErrors(errors, statusElementId, statusFunction) {
  const message = errors.join('; ');
  if (statusFunction) {
    statusFunction(message, 'error');
  } else {
    const el = document.getElementById(statusElementId);
    if (el) {
      el.hidden = false;
      el.textContent = message;
      el.className = 'upload-status error';
    }
  }
}
