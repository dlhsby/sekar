/**
 * App logger — console output only in development builds; errors are always
 * forwarded to crash reporting (Sentry no-ops until initialized, e.g. when no
 * DSN is configured in dev).
 *
 * Release builds additionally strip remaining console.debug/log calls via
 * babel-plugin-transform-remove-console (see babel.config.js), so the long
 * tail of legacy console call sites never reaches production devices.
 */
import { captureException } from '../services/crashReporting/sentry';

export const logger = {
  debug(...args: unknown[]): void {
    if (__DEV__) console.debug(...args);
  },

  warn(...args: unknown[]): void {
    if (__DEV__) console.warn(...args);
  },

  /** Logs in dev and reports the error object to crash reporting. */
  error(message: string, error?: unknown): void {
    if (__DEV__) console.error(message, error);
    if (error !== undefined) captureException(error);
  },
};
