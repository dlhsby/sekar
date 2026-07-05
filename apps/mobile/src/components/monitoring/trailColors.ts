/**
 * Canonical colors for the location trail.
 *
 * Lives in its own module so non-map components (TrailInfoBar, tests, etc.)
 * can consume the same tokens without dragging in react-native-maps via
 * LocationTrail.tsx.
 */

import { nbColors } from '../../constants/nbTokens';

/** Polyline color — uniform blue for the trail line itself. */
export const TRAIL_LINE_COLOR = nbColors.info;
/** Inside-area accent: design-token green (used on dots + stat card). */
export const TRAIL_INSIDE_COLOR = nbColors.successDark;
/** Outside-area accent: design-token orange. */
export const TRAIL_OUTSIDE_COLOR = nbColors.warning;
