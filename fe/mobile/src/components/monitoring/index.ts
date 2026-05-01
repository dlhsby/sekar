/**
 * Monitoring Components
 * Export all monitoring-related components (map, attendance, user tracking)
 * Phase 2D: Added four-status model components
 */

export { UserMarker } from './UserMarker';
export type { UserStatus } from './UserMarker';
export { default as AttendanceCard } from './AttendanceCard';
export { default as PhotoGallery } from './PhotoGallery';

// Phase 2D components
export { UserDetailSheet } from './UserDetailSheet';
export { StatusSummaryBar } from './StatusSummaryBar';
export { UserListCard } from './UserListCard';
export {
  LocationTrailMapLayers,
  LocationTrailOverlay,
  useLocationHistory,
  TRAIL_INSIDE_COLOR,
  TRAIL_OUTSIDE_COLOR,
} from './LocationTrail';
export { LocationTrailModal } from './LocationTrailModal';
export { MapFab } from './MapFab';
export { MapErrorBoundary } from './MapErrorBoundary';

/** @deprecated Use UserDetailSheet instead */
export { UserInfoCard } from './UserInfoCard';
