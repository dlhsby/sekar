/**
 * Localized copy for backend API error codes.
 *
 * The backend returns `{ code, message }` on errors; `getErrorMessage`
 * (lib/api/client.ts) calls `localizeApiError`, which resolves the `code` against
 * the active-language `errors` namespace (locales/<lng>/errors.json). Unmapped
 * codes fall back to the backend message, then a generic string. Keys are kept in
 * sync with `apps/be/src/common/enums/api-error-codes.enum.ts`.
 */
import i18n from './config';

/** Generic fallback in the active language when no code/message resolves. */
export const genericError = (): string => i18n.t('errors:GENERIC');

/**
 * Resolve an API error `code` (and optional backend message) to the active
 * language. Returns the mapped copy; otherwise the backend message; otherwise a
 * generic string.
 */
/**
 * Codes that carry no information on their own — they only say "the request was
 * refused", never WHY. When the backend also sent a message, that message is the
 * whole value of the response, so it wins. Without this a specific refusal
 * ("Satgas Shift 3 already has Shift 3 on 2026-07-23") was flattened to
 * "Permintaan tidak valid. Periksa kembali isian Anda." and the operator had no
 * idea what to change.
 */
const GENERIC_CODES = new Set([
  'BAD_REQUEST',
  'CONFLICT',
  'VALIDATION_ERROR',
  'UNPROCESSABLE_ENTITY',
]);

export function localizeApiError(code?: string, backendMessage?: string): string {
  const detail = backendMessage?.trim();
  if (code && GENERIC_CODES.has(code) && detail) {
    return detail;
  }
  if (code && i18n.exists(`errors:${code}`)) {
    return i18n.t(`errors:${code}`);
  }
  return detail || genericError();
}
