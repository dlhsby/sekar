// Re-export from permissionService (legacy, simple type)
export type { PermissionType as SimplePermissionType } from './permissionService';
export {
  requestLocationPermission,
  requestCameraPermission,
  requestClockInPermissions,
  showPermissionBlockedAlert,
  showPermissionDeniedAlert,
} from './permissionService';

// Re-export from PermissionManager (primary, enum-based)
export * from './PermissionManager';

// Re-export from usePermissionMonitor
export * from './usePermissionMonitor';
