// Expose `@types/geojson` as the global `GeoJSON` namespace used across the app
// (e.g. `GeoJSON.Polygon`). This global previously arrived transitively via the
// old map SDK's types; it is now a direct dependency, and this shim re-publishes
// it as the ambient global namespace.
import type * as GeoJSONModule from 'geojson';

declare global {
  export import GeoJSON = GeoJSONModule;
}
