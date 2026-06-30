/**
 * Indonesian mobile-number helpers (web mirror of the backend `phone.util`).
 * The app standardizes on the local `08xxxxxxxxxx` format; `normalizePhone`
 * collapses `+62…`/`62…`/`8…` (and spaces/dashes) to `08…`.
 */

/** `08` followed by 8–12 digits (total 10–14). */
export const INDO_MOBILE_REGEX = /^08[0-9]{8,12}$/;

/** Convert any common Indonesian mobile spelling to `08…`. */
export function normalizePhone(input: string | null | undefined): string {
  if (input == null) return '';
  let digits = String(input).trim().replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (/^62\d+/.test(digits)) return `0${digits.slice(2)}`;
  if (/^8\d+/.test(digits)) return `0${digits}`;
  return digits;
}
