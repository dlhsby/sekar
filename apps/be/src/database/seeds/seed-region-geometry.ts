import { DataSource } from 'typeorm';
import '../../config/load-env';

/**
 * Seed Kawasan (Region) Derived Geometry
 *
 * Populates boundary_polygon and center_lat/center_lng for all regions
 * based on their member locations' GPS coordinates. Idempotent: only updates
 * regions where boundary_polygon IS NULL, so existing boundaries (e.g., from
 * future KMZ imports) are never clobbered.
 *
 * Algorithm per region:
 *  - ≥3 member points with coords → convex hull, expanded 12% outward
 *  - 1–2 member points → bounding box (150m margin)
 *  - 0 member points → skipped (left null)
 *  - Collinear points → bounding box fallback
 *
 * Center = centroid (average) of member points.
 *
 * Usage: npm run db:seed:region-geometry
 */

/** Convex hull using Andrew's monotone chain algorithm. */
function convexHull(pts: Array<[number, number]>): Array<[number, number]> {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const build = (src: Array<[number, number]>) => {
    const h: Array<[number, number]> = [];
    for (const pt of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], pt) <= 0) {
        h.pop();
      }
      h.push(pt);
    }
    h.pop();
    return h;
  };

  return [...build(p), ...build([...p].reverse())];
}

/** Expand each hull vertex outward from centroid by factor, so member lokasi sit inside. */
function expand(ring: Array<[number, number]>, cx: number, cy: number, factor: number) {
  return ring.map(([x, y]): [number, number] => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

const M_PER_DEG = 111_320;

/**
 * Bounding box of given pins, padded by margin metres.
 * Ensures all member points sit within the box (not on edge or outside).
 */
function boundingBox(pts: Array<[number, number]>, margin: number): Array<[number, number]> {
  const lats = pts.map((p) => p[1]);
  const lngs = pts.map((p) => p[0]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const dLat = margin / M_PER_DEG;
  const dLng = dLat / Math.cos((midLat * Math.PI) / 180);
  const [mnLo, mxLo] = [Math.min(...lngs) - dLng, Math.max(...lngs) + dLng];
  const [mnLa, mxLa] = [Math.min(...lats) - dLat, Math.max(...lats) + dLat];
  return [
    [mnLo, mnLa],
    [mxLo, mnLa],
    [mxLo, mxLa],
    [mnLo, mxLa],
  ];
}

async function seedRegionGeometry() {
  console.log('🗺️  Seeding Kawasan (Region) Geometry…\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // Fetch all regions with their member locations' coords, WHERE boundary_polygon IS NULL
    const rows = (await queryRunner.query(
      `SELECT r.id,
              r.name,
              r.rayon_id,
              COALESCE(
                json_agg(json_build_array(l.gps_lng, l.gps_lat))
                  FILTER (WHERE l.id IS NOT NULL AND l.gps_lat IS NOT NULL),
                '[]'
              ) AS pts
         FROM regions r
         LEFT JOIN locations l ON l.region_id = r.id AND l.deleted_at IS NULL
        WHERE r.deleted_at IS NULL AND r.boundary_polygon IS NULL
        GROUP BY r.id, r.name, r.rayon_id
        ORDER BY r.id`,
    )) as Array<{
      id: string;
      name: string;
      rayon_id: string;
      pts: Array<[number, number]>;
    }>;

    if (rows.length === 0) {
      console.log('  ℹ️  All regions already have geometry. Nothing to do.\n');
      return;
    }

    console.log(`  Processing ${rows.length} regions…\n`);

    let hulled = 0;
    let boxed = 0;
    let skipped = 0;

    for (const r of rows) {
      const pts = r.pts.map(([lng, lat]): [number, number] => [Number(lng), Number(lat)]);
      let ring: Array<[number, number]> | null = null;

      if (pts.length >= 3) {
        const hull = convexHull(pts);
        if (hull.length >= 3) {
          const cx = hull.reduce((a, p) => a + p[0], 0) / hull.length;
          const cy = hull.reduce((a, p) => a + p[1], 0) / hull.length;
          ring = expand(hull, cx, cy, 1.12); // 12% expansion
          hulled += 1;
        } else {
          // Collinear points collapse to a line; use bounding box instead
          ring = boundingBox(pts, 150);
          boxed += 1;
        }
      } else if (pts.length > 0) {
        // 1–2 points: bound them with 150m margin
        ring = boundingBox(pts, 150);
        boxed += 1;
      } else {
        // No member locations with coords: skip
        skipped += 1;
        continue;
      }

      // Close the ring (first point repeated as last)
      const closed = [...ring, ring[0]];

      // Compute center as centroid of the ring
      const cLng = ring.reduce((a, p) => a + p[0], 0) / ring.length;
      const cLat = ring.reduce((a, p) => a + p[1], 0) / ring.length;

      // Update region (idempotent: WHERE boundary_polygon IS NULL ensures we never clobber)
      await queryRunner.query(
        `UPDATE regions
            SET boundary_polygon = $1::jsonb, center_lat = $2, center_lng = $3
          WHERE id = $4 AND boundary_polygon IS NULL`,
        [JSON.stringify({ type: 'Polygon', coordinates: [closed] }), cLat, cLng, r.id],
      );
    }

    console.log('  ══════════════════════════════════════════════════════════');
    console.log(`  ✓ Hulled (≥3 member points):   ${hulled}`);
    console.log(`  ✓ Boxed (1–2 member points):   ${boxed}`);
    console.log(`  ⊘ Skipped (no member coords):  ${skipped}`);
    console.log(`  ══════════════════════════════════════════════════════════\n`);

    // Spot-check: show 3 updated regions with their centers
    const spotCheck = (await queryRunner.query(
      `SELECT id, name, center_lat, center_lng,
              (SELECT COUNT(*) FROM locations WHERE region_id = regions.id AND deleted_at IS NULL) as member_count
         FROM regions
        WHERE boundary_polygon IS NOT NULL
        ORDER BY id
        LIMIT 3`,
    )) as Array<{
      id: string;
      name: string;
      center_lat: string;
      center_lng: string;
      member_count: string;
    }>;

    if (spotCheck.length > 0) {
      console.log('  📍 Spot-check (sample regions with new geometry):');
      for (const r of spotCheck) {
        console.log(
          `    • ${r.name} (${r.member_count} members): center @ ${r.center_lat}, ${r.center_lng}`,
        );
      }
      console.log('');
    }

    // Verify centers fall within member bounding boxes (sanity check)
    const outliers = (await queryRunner.query(
      `WITH region_bounds AS (
        SELECT r.id, r.name, r.center_lat, r.center_lng,
               MIN(l.gps_lat) AS min_lat, MAX(l.gps_lat) AS max_lat,
               MIN(l.gps_lng) AS min_lng, MAX(l.gps_lng) AS max_lng
          FROM regions r
          JOIN locations l ON l.region_id = r.id AND l.deleted_at IS NULL
         WHERE r.boundary_polygon IS NOT NULL
         GROUP BY r.id, r.name, r.center_lat, r.center_lng
      )
      SELECT id, name
        FROM region_bounds
       WHERE (center_lat < min_lat OR center_lat > max_lat
          OR center_lng < min_lng OR center_lng > max_lng)`,
    )) as Array<{ id: string; name: string }>;

    if (outliers.length > 0) {
      console.log('  ⚠️  Sanity check: centers outside member bounds (unexpected):');
      for (const r of outliers) {
        console.log(`    • ${r.name} — review geometry`);
      }
      console.log('');
    } else {
      console.log('  ✅ Sanity check: all centers within member coordinate ranges\n');
    }

    console.log('✅ Region geometry seed complete.\n');
  } catch (error) {
    console.error('❌ Error during region geometry seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedRegionGeometry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
