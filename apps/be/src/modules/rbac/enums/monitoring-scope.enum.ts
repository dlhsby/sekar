/**
 * MonitoringScope — how much of the org a role may see, and which scope inputs
 * appear on the user form. Single source of truth per ADR-044.
 *
 * - city:     whole Surabaya (no binding)
 * - district: one district (`district_id`)
 * - region:   one region/kawasan (`district_id` + `region_id`), optional single location
 * - location: one area (`district_id` + `region_id` + `location_id`)
 * - none:     no monitoring access / no scope inputs (satgas, linmas, staff_kecamatan)
 */
export enum MonitoringScope {
  CITY = 'city',
  DISTRICT = 'district',
  REGION = 'region',
  LOCATION = 'location',
  NONE = 'none',
}

export const MONITORING_SCOPES: readonly MonitoringScope[] = Object.values(MonitoringScope);
