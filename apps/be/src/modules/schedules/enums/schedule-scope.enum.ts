export enum ScheduleScope {
  STATIC = 'static',
  MOBILE = 'mobile',
  /** Rayon-wide placement (no fixed location/region) — e.g. a roving crew. */
  RAYON = 'rayon',
  /** City-wide placement (no rayon/region/location) — e.g. a Tim Patroli covering all Surabaya. */
  CITY = 'city',
}
