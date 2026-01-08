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

