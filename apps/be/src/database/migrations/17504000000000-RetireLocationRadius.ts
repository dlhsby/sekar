import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire `locations.radius_meters` — geofencing is coordinate + boundary only.
 *
 * Backfills every radius-only lokasi with a real `boundary_polygon` derived from
 * the radius it is geofenced by today, **then** drops the column.
 *
 * Why this has to come first: `GpsUtil.isWithinAreaBoundary` **fails OPEN** — its
 * last branch is *"no boundary defined → allow"*. So the moment the backend stops
 * consulting the radius fallback, a lokasi with no polygon stops being
 * ungeofenced-and-loud and becomes **always-inside-and-silent**. Converting the
 * radius into geometry first means those lokasi keep the exact geofence they have
 * today, just expressed as a polygon.
 *
 * `radius_meters` was never really data: every row carries the same `100`,
 * hardcoded as a default at `import.service.ts`. On the seeded DB this touches 5
 * lokasi, all in Rayon Taman Aktif (Kunang2, Kombes, Korea, Pandugo, Wirasurya)
 * — real parks with workers clocking in.
 */
export class RetireLocationRadius17504000000000 implements MigrationInterface {
  name = 'RetireLocationRadius17504000000000';

  /** Points around the generated circle. 32 keeps the ring smooth without bloating the JSONB. */
  private static readonly CIRCLE_POINTS = 32;
  private static readonly METERS_PER_DEGREE_LAT = 111_320;

  /**
   * A GeoJSON Polygon approximating a circle. Longitude degrees shrink with
   * latitude, so the lng step is scaled by cos(lat) — without it the ring would
   * be an ellipse stretched east-west (~0.5% off at Surabaya's latitude, but
   * wrong is wrong).
   */
  private circlePolygon(lat: number, lng: number, radiusMeters: number): object {
    const latDelta = radiusMeters / RetireLocationRadius17504000000000.METERS_PER_DEGREE_LAT;
    const lngDelta = latDelta / Math.cos((lat * Math.PI) / 180);
    const ring: Array<[number, number]> = [];

    for (let i = 0; i < RetireLocationRadius17504000000000.CIRCLE_POINTS; i += 1) {
      const theta = (2 * Math.PI * i) / RetireLocationRadius17504000000000.CIRCLE_POINTS;
      ring.push([lng + lngDelta * Math.cos(theta), lat + latDelta * Math.sin(theta)]);
    }
    ring.push(ring[0]); // GeoJSON rings must close.

    return { type: 'Polygon', coordinates: [ring] };
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT id, gps_lat, gps_lng, radius_meters
        FROM locations
       WHERE boundary_polygon IS NULL
         AND gps_lat IS NOT NULL
         AND gps_lng IS NOT NULL
         AND radius_meters IS NOT NULL
         AND radius_meters > 0
         AND deleted_at IS NULL
    `)) as Array<{ id: string; gps_lat: string; gps_lng: string; radius_meters: number }>;

    for (const r of rows) {
      const polygon = this.circlePolygon(
        parseFloat(r.gps_lat),
        parseFloat(r.gps_lng),
        Number(r.radius_meters),
      );
      await queryRunner.query(`UPDATE locations SET boundary_polygon = $1::jsonb WHERE id = $2`, [
        JSON.stringify(polygon),
        r.id,
      ]);
    }

    // Only now, once every lokasi has geometry, is the column safe to drop.
    await queryRunner.query(`ALTER TABLE locations DROP COLUMN IF EXISTS radius_meters`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restores the column and its universal default (every row carried 100).
    // It deliberately does NOT un-derive the polygons written by `up()`: which
    // lokasi were radius-only is unrecoverable once the column is gone, and a
    // derived ring is strictly better than the fail-open nothing it replaced —
    // reverting them would silently un-geofence those lokasi.
    await queryRunner.query(
      `ALTER TABLE locations ADD COLUMN IF NOT EXISTS radius_meters integer DEFAULT 100`,
    );
  }
}
