/**
 * Unit Tests: KML / GeoJSON boundary import parser
 */
import { parseKmlToGeometry } from '../kml';

// A Google-Earth-style export: default KML namespace, a single Placemark polygon,
// coordinates as `lng,lat,alt` tuples, plus the trailing binary `<?earth …?>` PI
// that makes the raw string invalid XML unless truncated at </kml>.
const SINGLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Taman Bungkul</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              112.7380,-7.2900,0 112.7400,-7.2900,0 112.7400,-7.2920,0 112.7380,-7.2920,0 112.7380,-7.2900,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
<?earth data="AAAABBBBCCCCDDDD=="?>`;

const MULTI_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
    112.70,-7.20 112.71,-7.20 112.71,-7.21 112.70,-7.20
  </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
  <Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
    112.80,-7.30 112.81,-7.30 112.81,-7.31 112.80,-7.30
  </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
</Document></kml>`;

describe('parseKmlToGeometry', () => {
  it('parses a single Placemark polygon (ignoring the trailing <?earth?> blob)', () => {
    const geom = parseKmlToGeometry(SINGLE_KML);
    expect(geom).not.toBeNull();
    expect(geom!.type).toBe('Polygon');
    const poly = geom as GeoJSON.Polygon;
    expect(poly.coordinates[0]).toHaveLength(5);
    // GeoJSON order is [lng, lat].
    expect(poly.coordinates[0][0]).toEqual([112.738, -7.29]);
    // Ring is closed.
    expect(poly.coordinates[0][0]).toEqual(poly.coordinates[0][4]);
  });

  it('returns a MultiPolygon when there are multiple Placemark polygons', () => {
    const geom = parseKmlToGeometry(MULTI_KML);
    expect(geom).not.toBeNull();
    expect(geom!.type).toBe('MultiPolygon');
    expect((geom as GeoJSON.MultiPolygon).coordinates).toHaveLength(2);
  });

  it('auto-closes an unclosed ring', () => {
    const open = `<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
      112.70,-7.20 112.71,-7.20 112.71,-7.21
    </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`;
    const poly = parseKmlToGeometry(open) as GeoJSON.Polygon;
    expect(poly).not.toBeNull();
    expect(poly.coordinates[0][0]).toEqual(poly.coordinates[0][poly.coordinates[0].length - 1]);
  });

  it('parses pasted GeoJSON (Feature with a Polygon geometry)', () => {
    const feature = JSON.stringify({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.7, -7.2],
            [112.71, -7.2],
            [112.71, -7.21],
            [112.7, -7.2],
          ],
        ],
      },
    });
    const geom = parseKmlToGeometry(feature);
    expect(geom).not.toBeNull();
    expect(geom!.type).toBe('Polygon');
  });

  it('returns null for empty / non-geometry / garbage input', () => {
    expect(parseKmlToGeometry('')).toBeNull();
    expect(parseKmlToGeometry('   ')).toBeNull();
    expect(parseKmlToGeometry('not xml at all')).toBeNull();
    expect(parseKmlToGeometry('<kml><Document></Document></kml>')).toBeNull();
    // A degenerate ring (fewer than 3 distinct points) is rejected.
    expect(
      parseKmlToGeometry(
        '<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>112.7,-7.2</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>',
      ),
    ).toBeNull();
  });
});
