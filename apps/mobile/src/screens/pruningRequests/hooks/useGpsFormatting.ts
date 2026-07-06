/**
 * useGpsFormatting — thin wrapper/re-export of shared gpsFormat utilities
 */

import { formatGps } from '../../../utils/gpsFormat';

export { formatGps } from '../../../utils/gpsFormat';

export function useGpsFormatting() {
  return { formatGps };
}
