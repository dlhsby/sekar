/**
 * Feature Flags
 * Phase 3: Gradual roll-out of monitoring v2 features.
 * Set a flag to true in a local build to enable the feature in development.
 * Never enable in production without a full QA pass.
 */

export const featureFlags = {
  /**
   * Enable ClusteredUserMarkers (Phase 3 sub-phase 3-5) instead of the legacy
   * per-user UserMarker loop. When false, the original Phase 2D code path runs.
   */
  clusterMarkersV2: false,
} as const;

export type FeatureFlags = typeof featureFlags;
