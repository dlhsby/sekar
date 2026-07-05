import * as bcrypt from 'bcrypt';

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
export const DEFAULT_PASSWORD = '12345678';

/** bcrypt(DEFAULT_PASSWORD, 10 rounds). Regenerate if DEFAULT_PASSWORD changes. */
export const DEFAULT_PASSWORD_HASH = '$2b$10$dPclKFdgVahMcFtXmJTzcum5UDpJNOFDubhs61zLiPt/HnvomNEuO';

/**
 * Password hash for the canonical `superadmin` account, standardized across
 * every seeder. Sourced from the single env var SEED_SUPERADMIN_PASSWORD
 * (set encrypted in apps/be/.env.staging / the prod env). Local/dev leaves it
 * unset → falls back to the shared default so `npm run db:seed` works without
 * config. The superadmin is always seeded with `password_must_change = FALSE`
 * (no forced reset) — see the seeders. `requireEnv` makes an unset/short value
 * fail loudly instead of falling back (used by the production seeder).
 */
export function superadminPasswordHash(opts: { requireEnv?: boolean } = {}): string {
  const pw = process.env.SEED_SUPERADMIN_PASSWORD?.trim();
  if (!pw) {
    if (opts.requireEnv) {
      throw new Error(
        'SEED_SUPERADMIN_PASSWORD must be set (min 12 chars) to seed the superadmin account.',
      );
    }
    return DEFAULT_PASSWORD_HASH;
  }
  if (opts.requireEnv && pw.length < 12) {
    throw new Error('SEED_SUPERADMIN_PASSWORD must be at least 12 characters.');
  }
  return bcrypt.hashSync(pw, 10);
}
