/**
 * Asset lifecycle status (state machine — see ADR-026 / assets.md §B).
 * available → in_use → (maintenance) → available → retired | lost
 */
export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
  LOST = 'lost',
}

/** Physical condition of an asset / at checkout / at return. */
export enum AssetCondition {
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DAMAGED = 'damaged',
  UNUSABLE = 'unusable',
}

/** Condition selectable at checkout (subset — an asset in use can't already be unusable). */
export const CHECKOUT_CONDITIONS: AssetCondition[] = [
  AssetCondition.GOOD,
  AssetCondition.FAIR,
  AssetCondition.POOR,
  AssetCondition.DAMAGED,
];

export enum MaintenanceType {
  ROUTINE = 'routine',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  REPLACEMENT = 'replacement',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}
