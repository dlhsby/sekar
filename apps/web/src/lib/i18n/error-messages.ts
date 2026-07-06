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
export function localizeApiError(code?: string, backendMessage?: string): string {
  if (code && i18n.exists(`errors:${code}`)) {
    return i18n.t(`errors:${code}`);
  }
  return backendMessage?.trim() || genericError();
}
