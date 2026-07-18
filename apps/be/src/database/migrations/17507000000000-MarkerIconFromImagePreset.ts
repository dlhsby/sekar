import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unify markers on the glyph system (icon + color): carry each area's
 * `marker_image_url` **preset** over to a `marker_icon` glyph, so the map can
 * render a code-drawn pin (glyph in the area's `border_color`, with a staffing
 * count + status ring) instead of a static image. The 9 `pin-*.svg` presets map
 * to their equivalent glyph; uploaded images (data:/non-preset URLs) have no
 * glyph equivalent, so they fall back to the per-kind default at render time
 * (left as-is here). `marker_image_url` is retired in a later cleanup once the
 * web reads `marker_icon`.
 *
 * Only fills rows that still have `marker_icon IS NULL`, so an explicit glyph is
 * never clobbered. Down-migration is a no-op (the source column is untouched).
 */
export class MarkerIconFromImagePreset17507000000000 implements MigrationInterface {
  name = 'MarkerIconFromImagePreset17507000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // preset filename fragment → glyph name (mirrors pin-*.svg inner glyphs).
    const map: [string, string][] = [
      ['pin-orange', 'building'],
      ['pin-green', 'tree'],
      ['pin-blue', 'shield'],
      ['pin-teal', 'droplets'],
      ['pin-yellow', 'star'],
      ['pin-purple', 'star'],
      ['pin-red', 'user'],
      ['pin-sage', 'user'],
      ['pin-gray', 'user'],
    ];
    for (const table of ['rayons', 'regions', 'locations']) {
      for (const [fragment, glyph] of map) {
        await queryRunner.query(
          `UPDATE "${table}" SET "marker_icon" = $1
             WHERE "marker_icon" IS NULL AND "marker_image_url" LIKE $2`,
          [glyph, `%${fragment}%`],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // No-op: marker_image_url was left intact, so the glyphs can simply be re-derived.
  }
}
