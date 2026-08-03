/**
 * Shared localisation of location failures.
 *
 * The same `error.code` switch was written out at four call sites (clock-in,
 * the tracker, the permission probe, the activity form), each mapping the five
 * `PositionError` codes to slightly different strings. Centralising it means a
 * new failure mode — such as a rejected mock fix — shows consistent copy
 * everywhere instead of only where someone remembered to add it.
 */

import { MockedLocationError } from './verifiedPosition';
import i18n from '../../i18n/config';

/**
 * Coarse classification used by callers that branch on the failure rather than
 * just displaying it (e.g. the tracker retries only on a timeout).
 */
export type LocationErrorType =
  | 'permission_denied'
  | 'gps_disabled'
  | 'timeout'
  | 'mocked'
  | 'unknown';

/** `PositionError` values from react-native-geolocation-service. */
const POSITION_ERROR: Record<number, LocationErrorType> = {
  1: 'permission_denied', // PERMISSION_DENIED
  2: 'gps_disabled', //     POSITION_UNAVAILABLE
  3: 'timeout', //          TIMEOUT
  4: 'unknown', //          PLAY_SERVICE_NOT_AVAILABLE
  5: 'gps_disabled', //     SETTINGS_NOT_SATISFIED
};

const MESSAGE_KEY: Record<LocationErrorType, string> = {
  permission_denied: 'location:errors.permissionDenied',
  gps_disabled: 'location:errors.gpsDisabled',
  timeout: 'location:errors.timeout',
  mocked: 'location:errors.mockedLocation',
  unknown: 'location:errors.unavailableGeneral',
};

/** Classify any thrown location failure. */
export const classifyLocationError = (error: unknown): LocationErrorType => {
  if (error instanceof MockedLocationError) {
    return 'mocked';
  }
  const code = (error as { code?: number } | null)?.code;
  return (typeof code === 'number' && POSITION_ERROR[code]) || 'unknown';
};

/** Localised, user-facing message for any thrown location failure. */
export const describeLocationError = (error: unknown): string =>
  i18n.t(MESSAGE_KEY[classifyLocationError(error)]);
