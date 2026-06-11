/**
 * Geometry + GPS primitives shared across domain models.
 */

/** GeoJSON Polygon as stored in the backend (jsonb column).
 *  coordinates[0] is the outer ring: [[lng, lat], ...] pairs. */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/** GeoJSON MultiPolygon — used by areas whose KMZ source had MultiGeometry
 *  (e.g. Taman Buk Tong, Jl. Menur RSJ Sisi Barat). Each entry in
 *  `coordinates` is itself a polygon (array of rings). */
export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

export type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

// GPS Coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// Location Ping (LocationLog in backend)
export interface LocationPing {
  id?: string;
  user_id?: string;
  shift_id?: string;
  timestamp: string;
  gps_lat: number;
  gps_lng: number;
  accuracy_meters: number;
  created_at?: string;
}
