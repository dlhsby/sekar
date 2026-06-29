/**
 * Shared seeding constants.
 *
 * Single source of truth for the default/test account password so every seeder
 * (and the docs) stay in sync. To rotate it, change DEFAULT_PASSWORD and
 * regenerate DEFAULT_PASSWORD_HASH:
 *
 *   node -e "require('bcrypt').hash('NewPassword!',10).then(console.log)"
 *
 * Seeded accounts are created with `password_must_change = true` so the first
 * login forces a reset (enforced client-side and by PasswordChangeRequiredGuard).
 */

/** Plaintext default password for all seeded/test accounts. */
export const DEFAULT_PASSWORD = 'Password123!';

/** bcrypt(DEFAULT_PASSWORD, 10 rounds). Regenerate if DEFAULT_PASSWORD changes. */
export const DEFAULT_PASSWORD_HASH = '$2b$10$8gE6VV8J4S95ivFYs.dEK.E2W.zKotQ3IfFohDGLbIXZnNa.NtgTi';
