/**
 * Validation Utilities
 * Input validation helper functions
 */

/**
 * Validate email format
 * @param email - Email string
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username
 * @param username - Username string
 * @returns True if valid
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.trim().length === 0) {
    return false;
  }
  return username.length >= 3 && username.length <= 50;
}

/**
 * Validate password
 * @param password - Password string
 * @returns True if valid
 */
export function isValidPassword(password: string): boolean {
  if (!password) {
    return false;
  }
  return password.length >= 6;
}

/**
 * Validate GPS coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns True if valid
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Validate notes text length
 * @param notes - Notes string
 * @param maxLength - Maximum length (default: 500)
 * @returns True if valid
 */
export function isValidNotesLength(
  notes: string,
  maxLength: number = 500,
): boolean {
  return notes.length <= maxLength;
}

/**
 * Validate required field
 * @param value - Value to check
 * @returns True if not empty
 */
export function isRequired(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  return value.trim().length > 0;
}

/**
 * Get validation error message
 * @param field - Field name
 * @param type - Validation type
 * @returns Error message
 */
export function getValidationError(
  field: string,
  type: 'required' | 'invalid' | 'too_short' | 'too_long',
): string {
  const messages = {
    required: `${field} is required`,
    invalid: `${field} is invalid`,
    too_short: `${field} is too short`,
    too_long: `${field} is too long`,
  };
  return messages[type];
}

/**
 * Sanitize string input
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input.trim();
}

/**
 * Validate a UUID (any RFC 4122 version, v1–v5).
 *
 * IMPORTANT: never version-pin this. SEKAR entity ids are a mix of random v4 and
 * deterministic v5 (uuidv5 for seeded areas + sheet-imported roster users), so a
 * v4-only check would wrongly reject real ids (e.g. an area_id sent on clock-in)
 * and surface as a 400 from the API. Accept any version; the server checks the FK.
 * @param uuid - UUID string to validate
 * @returns True if a well-formed UUID of any version
 */
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) {
    return false;
  }
  // Version-agnostic UUID pattern (v1–v5). Do NOT pin the version nibble to `4`.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Alias of {@link isValidUUID} (which already accepts any UUID version). Prefer
 * `isValidUUID`; kept so existing imports keep working.
 */
export function isValidUUIDAny(uuid: string | null | undefined): boolean {
  return isValidUUID(uuid);
}

