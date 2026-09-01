/**
 * Marker entity kinds — used by coordinate-link and map displays to tag what
 * kind of entity a marker represents (district, region, location, team).
 *
 * Note: The old image-based marker system has been retired (ADR-051). Markers
 * are now rendered as glyph+color pins only. This file is retained for the
 * type exports needed by downstream components.
 */

export type MarkerEntityKind = 'district' | 'region' | 'location' | 'team';
