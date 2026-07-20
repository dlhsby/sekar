/**
 * Static support contacts for the pre-login "forgot password" flow.
 *
 * Mirrors the mobile AS-4 reconciliation: `/districts` is auth-protected and the
 * caller's district can't be inferred pre-login, so a single static hotline is
 * shown instead of per-district contacts.
 *
 * TODO: source these from public runtime config / env once exposed.
 */
export const SUPPORT_WHATSAPP = '6281200000000';
export const SUPPORT_PHONE = '+62 31 0000 0000';

/** Digits-only phone for the `tel:` link. */
export const SUPPORT_PHONE_TEL = SUPPORT_PHONE.replace(/[^\d+]/g, '');
