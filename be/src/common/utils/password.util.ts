import { randomInt } from 'crypto';

/**
 * Readable alphabet for generated temporary passwords — excludes visually
 * ambiguous characters (0/O, 1/l/I) so admins can dictate/copy them reliably.
 */
const READABLE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generate a random, readable temporary password (e.g. "X7k9m-Qp2rT").
 *
 * Used for admin-created accounts and password resets: the plaintext is shown
 * to the admin exactly once and the user is forced to change it on first login
 * (`password_must_change`). Uses `crypto.randomInt` for unbiased selection.
 *
 * @param length total number of alphabet characters (default 10; always ≥ the
 *   6-char minimum enforced by ValidationConstants.PASSWORD_MIN_LENGTH).
 */
export function generateTempPassword(length = 10): string {
  const size = Math.max(8, length);
  let chars = '';
  for (let i = 0; i < size; i++) {
    chars += READABLE_ALPHABET[randomInt(READABLE_ALPHABET.length)];
  }
  // Group into two dash-separated halves for legibility.
  const mid = Math.ceil(size / 2);
  return `${chars.slice(0, mid)}-${chars.slice(mid)}`;
}
