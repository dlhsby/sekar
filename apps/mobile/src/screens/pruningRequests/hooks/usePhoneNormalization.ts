/**
 * usePhoneNormalization — pure phone formatting and linking helpers
 * Strips spaces/dashes, swaps leading 0 for 62 country code.
 */

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function usePhoneNormalization() {
  return { normalizePhone };
}
