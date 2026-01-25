/**
 * Input Sanitization Utilities
 * Functions to sanitize user input to prevent XSS and other security issues
 */

/**
 * Sanitize text input by removing HTML-like characters and control characters
 * @param input - Raw user input string
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and script content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize multiline text (preserves newlines)
 * @param input - Raw multiline input
 * @returns Sanitized multiline text
 */
export function sanitizeMultilineText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Split by lines, sanitize each, rejoin
  return input
    .split('\n')
    .map(line => sanitizeText(line))
    .join('\n')
    .trim();
}

/**
 * Sanitize filename (for file uploads)
 * @param filename - Original filename
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // Remove directory traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove special characters except dot, dash, underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const dotIndex = sanitized.lastIndexOf('.');
    if (dotIndex > 0 && dotIndex < sanitized.length - 1) {
      // Has extension - preserve it
      const ext = sanitized.substring(dotIndex);
      const maxNameLen = 255 - ext.length;
      const name = sanitized.substring(0, maxNameLen);
      sanitized = `${name}${ext}`;
    } else {
      // No extension - just truncate
      sanitized = sanitized.substring(0, 255);
    }
  }

  return sanitized || 'unnamed';
}

/**
 * Validate and sanitize GPS coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Valid coordinates or null if invalid
 */
export function sanitizeGpsCoordinates(
  lat: number | string,
  lng: number | string
): { lat: number; lng: number } | null {
  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { lat: latitude, lng: longitude };
}

/**
 * Sanitize username (alphanumeric and underscore only)
 * @param username - Raw username
 * @returns Sanitized username
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // Only allow alphanumeric and underscore
  return username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}
