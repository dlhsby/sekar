/**
 * Whether a user of a role must belong to a home rayon (district).
 * Distinct from MonitoringScope: monitoring reach says what a role can SEE;
 * home scope says which org unit a person BELONGS to. Kawasan/lokasi are never
 * a home — people get them through schedules (ADR-053).
 */
export enum HomeScope {
  NONE = 'none',
  DISTRICT = 'district',
}
