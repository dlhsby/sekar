/**
 * Indonesian mobile-number normalization.
 *
 * The app standardizes on the local `08xxxxxxxxxx` format everywhere (storage,
 * display, login). Input may arrive as `+62…`, `62…`, `8…`, or with spaces /
 * dashes; `normalizePhone` collapses all of those to `08…`. Invalid / empty
 * input is returned trimmed so DTO validation can reject it with a clear error.
 */

/** Local-format validity: `08` followed by 8–12 digits (total 10–14). */
export const INDO_MOBILE_REGEX = /^08[0-9]{8,12}$/;

/**
 * Convert any common Indonesian mobile spelling to `08…`.
 * - strips spaces, dashes, dots, parentheses and a leading `+`
 * - `62…`  → `0…`  (so `+62812…` / `62812…` → `0812…`)
 * - `8…`   → `08…` (bare national number)
 * Returns the cleaned string unchanged when it matches none of the above
 * (lets validation produce the error instead of silently mangling it).
 */
export function normalizePhone(input: string | null | undefined): string {
  if (input == null) return '';
  let digits = String(input)
    .trim()
    .replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (/^62\d+/.test(digits)) return `0${digits.slice(2)}`;
  if (/^8\d+/.test(digits)) return `0${digits}`;
  return digits;
}

/** Whether a value is a valid local-format Indonesian mobile after normalizing. */
export function isValidIndonesianMobile(input: string | null | undefined): boolean {
  return INDO_MOBILE_REGEX.test(normalizePhone(input));
}
