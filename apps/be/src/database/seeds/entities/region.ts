import type { SeedContext } from '../lib/context';
import { loadKawasanSnapshot, loadAreaRegionMap } from '../load-seed-data';

// Default per-level map styling (ADR-045). Boundaries/centres are drawn fresh in
// the UI, so seeded kawasan start with only these cosmetic defaults + a marker.
// Kawasan default styling — a green border/fill (parks theme), NOT black, so the
// map's per-entity colors read as intended. A user can still override per kawasan.
const BORDER_COLOR = '#2D5233';
const FILL_COLOR = '#7FBC8C';
const BORDER_OPACITY = 0.9;
const FILL_OPACITY = 0.2;
const MARKER_ICON = 'trees';

/**
 * Seed the Kawasan (Regions) from the client's workbook
 * (`data/kawasan.snapshot.json`) — the "Kawasan …" entries in each district tab's
 * column K, grouped under that district (ADR-045). Names + parent district only;
 * boundaries are drawn fresh in the UI. Deterministic ids make this idempotent.
 *
 * Runs for both demo and staging. Must run AFTER seedDistricts (FK district_id) and
 * seedAreas (the re-parent step sets locations.region_id).
 */
export async function seedRegions(ctx: SeedContext): Promise<void> {
  ctx.log('🗺️  Seeding Kawasan (Regions) from workbook…');

  const kawasan = loadKawasanSnapshot();
  const byDistrict = new Map<string, number>();
  for (const k of kawasan) {
    await ctx.qr.query(
      `INSERT INTO regions
         (id, name, district_id, border_color, fill_color, border_opacity, fill_opacity, marker_icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         district_id = EXCLUDED.district_id`,
      [
        k.id,
        k.name,
        k.district_id,
        BORDER_COLOR,
        FILL_COLOR,
        BORDER_OPACITY,
        FILL_OPACITY,
        MARKER_ICON,
      ],
    );
    byDistrict.set(k.district_id, (byDistrict.get(k.district_id) ?? 0) + 1);
  }

  ctx.log(`  ✓ ${kawasan.length} kawasan across ${byDistrict.size} districts`);

  // Re-parent areas under their kawasan (confident name matches from the
  // workbook; the rest stay unassigned for UI remediation). One bulk UPDATE via
  // a VALUES join. Only sets region_id where still NULL (never clobbers).
  const map = Object.entries(loadAreaRegionMap());
  if (map.length > 0) {
    const values = map.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::uuid)`).join(', ');
    const params = map.flat();
    await ctx.qr.query(
      `UPDATE locations AS l
          SET region_id = m.region_id
         FROM (VALUES ${values}) AS m(area_id, region_id)
        WHERE l.id = m.area_id
          AND l.region_id IS NULL`,
      params,
    );
    ctx.log(`  ✓ Re-parented ${map.length} areas under their kawasan`);
  }
}

// ─── Dummy kawasan geometry (demo only) ──────────────────────────────────────

/** Convex hull (Andrew's monotone chain). Returns points in CCW order. */
function convexHull(pts: Array<[number, number]>): Array<[number, number]> {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src: Array<[number, number]>) => {
    const h: Array<[number, number]> = [];
    for (const pt of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], pt) <= 0) h.pop();
      h.push(pt);
    }
    h.pop();
    return h;
  };
  return [...build(p), ...build([...p].reverse())];
}

/** Push each hull vertex outward from the centroid, so member lokasi sit inside. */
function expand(ring: Array<[number, number]>, cx: number, cy: number, factor: number) {
  return ring.map(([x, y]): [number, number] => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

const M_PER_DEG = 111_320;

function boxAround(lng: number, lat: number, meters: number): Array<[number, number]> {
  const dLat = meters / M_PER_DEG;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ];
}

/**
 * Bounding box of the given pins, padded by `margin` metres.
 *
 * Not a fixed-size box around their centroid: two lokasi further apart than the
 * box would then fall OUTSIDE their own kawasan, which is exactly the sort of
 * quietly-wrong geometry this is meant to avoid. The box must contain what it
 * is derived from.
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

/**
 * Give every kawasan a **placeholder** boundary + centre — demo only.
 *
 * ADR-045 gave kawasan per-level styling but never a shape: 0 of 129 carry a
 * polygon or a centre, so the ADR-046 region tier has literally nowhere to draw
 * a bubble and mobile crews have nothing to be geofenced against. The client is
 * supplying real KMZ (or drawing them) in parallel; this unblocks Phase 5
 * meanwhile.
 *
 * **These are dummies, not data.** They are derived from each kawasan's own
 * lokasi so they at least sit in the right place — a hull nobody believes is
 * worse than none — but they are not surveyed boundaries and must not be treated
 * as such. Import via `ImportBoundaryButton` / `GoogleBoundaryEditor` (already
 * wired for district + lokasi) replaces them; this only fills rows that are still
 * empty, so a real boundary is never clobbered.
 *
 * Three shapes, because the data is uneven (86 kawasan have ≥3 lokasi, 29 have
 * 1–2, and 14 have none at all):
 *  - **≥3 lokasi** → convex hull of their pins, expanded 25% so members sit inside.
 *  - **1–2 lokasi** → their bounding box + 150 m (a hull needs three points). It
 *    bounds the pins rather than sitting a fixed box on their centroid — two
 *    lokasi further apart than the box would otherwise fall outside their own
 *    kawasan.
 *  - **0 lokasi**  → a small box offset from the district centre, so the kawasan is
 *    still selectable. Purely arbitrary — flagged in the log.
 */
export async function seedRegionGeometry(ctx: SeedContext): Promise<void> {
  if (ctx.mode !== 'demo') return;

  ctx.log('🗺️  Seeding placeholder kawasan geometry (demo only — real KMZ replaces this)…');

  const rows = (await ctx.qr.query(
    `SELECT r.id,
            r.district_id,
            ry.center_lat AS rayon_lat,
            ry.center_lng AS rayon_lng,
            COALESCE(
              json_agg(json_build_array(l.gps_lng, l.gps_lat))
                FILTER (WHERE l.id IS NOT NULL AND l.gps_lat IS NOT NULL),
              '[]'
            ) AS pts
       FROM regions r
       JOIN districts ry ON ry.id = r.district_id
       LEFT JOIN locations l ON l.region_id = r.id AND l.deleted_at IS NULL
      WHERE r.deleted_at IS NULL AND r.boundary_polygon IS NULL
      GROUP BY r.id, r.district_id, ry.center_lat, ry.center_lng
      ORDER BY r.id`,
  )) as Array<{
    id: string;
    rayon_lat: string | null;
    rayon_lng: string | null;
    pts: Array<[number, number]>;
  }>;

  let hulled = 0;
  let boxed = 0;
  let orphan = 0;

  for (const [i, r] of rows.entries()) {
    const pts = r.pts.map(([lng, lat]): [number, number] => [Number(lng), Number(lat)]);
    let ring: Array<[number, number]>;

    if (pts.length >= 3) {
      const hull = convexHull(pts);
      if (hull.length >= 3) {
        const cx = hull.reduce((a, p) => a + p[0], 0) / hull.length;
        const cy = hull.reduce((a, p) => a + p[1], 0) / hull.length;
        ring = expand(hull, cx, cy, 1.25);
        hulled += 1;
      } else {
        // Collinear pins — a hull collapses to a line, so bound them instead.
        ring = boundingBox(pts, 150);
        boxed += 1;
      }
    } else if (pts.length > 0) {
      // A hull needs three points; bound the one or two we have.
      ring = boundingBox(pts, 150);
      boxed += 1;
    } else {
      if (r.rayon_lat == null || r.rayon_lng == null) continue;
      // No lokasi at all: park it near the district centre, fanned out by index so
      // several such kawasan don't stack on the same spot.
      const angle = (i * 2 * Math.PI) / Math.max(rows.length, 1);
      const offset = 0.01;
      ring = boxAround(
        Number(r.rayon_lng) + offset * Math.cos(angle),
        Number(r.rayon_lat) + offset * Math.sin(angle),
        250,
      );
      orphan += 1;
    }

    const closed = [...ring, ring[0]];
    const cLng = ring.reduce((a, p) => a + p[0], 0) / ring.length;
    const cLat = ring.reduce((a, p) => a + p[1], 0) / ring.length;

    await ctx.qr.query(
      `UPDATE regions
          SET boundary_polygon = $1::jsonb, center_lat = $2, center_lng = $3
        WHERE id = $4 AND boundary_polygon IS NULL`,
      [JSON.stringify({ type: 'Polygon', coordinates: [closed] }), cLat, cLng, r.id],
    );
  }

  ctx.log(`  ✓ ${hulled} from member lokasi (hull) · ${boxed} boxed (1–2 lokasi)`);
  if (orphan > 0) {
    ctx.log(`  ⚠ ${orphan} kawasan have NO lokasi — placed arbitrarily near their district centre`);
  }
}
