export enum ScheduleScope {
  STATIC = 'static',
  MOBILE = 'mobile',
  /** Rayon-wide placement (no fixed location/region) — e.g. a roving crew. */
  RAYON = 'district',
  /** City-wide placement (no district/region/location) — e.g. a Tim Patroli covering all Surabaya. */
  CITY = 'city',
}
