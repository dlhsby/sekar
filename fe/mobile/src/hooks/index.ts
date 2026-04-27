/**
 * Hooks barrel export
 */

export { useLocationPermission } from './useLocationPermission';
export type {
  LocationPermissionState,
  UseLocationPermissionOptions,
} from './useLocationPermission';
export { useRoleAccess } from './useRoleAccess';
export { useActivityTypes } from './useActivityTypes';
export { usePhotoCapture } from './usePhotoCapture';
export { useProfileLogout } from './useProfileLogout';
export { useProfileSync } from './useProfileSync';
export { useProfileData } from './useProfileData';
export type { FieldStats, MonitoringStats } from './useProfileData';
export type { SyncStatus } from './useProfileSync';
export { useClockInOut } from './useClockInOut';
export type { LocationState } from './useClockInOut';
export { useActivityForm } from './useActivityForm';
export type { FormState, FormErrors } from './useActivityForm';
export { useMapDashboard } from './useMapDashboard';
export { useMapAutoFocus } from './useMapAutoFocus';
export { useHomeLocation } from './useHomeLocation';
export type { HomeLocationState } from './useHomeLocation';
export { useUserRole } from './useUserRole';
export { useNetworkStatus } from './useNetworkStatus';
