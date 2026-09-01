import type { SeedContext } from '../lib/context';

/**
 * Seed the team-category catalog (ADR-048, amended): the crew-type categories with
 * their map marker + bubble colour. Concrete teams (name/PIC/members) are
 * defined per schedule event — there is no standing `teams` table anymore.
 * Idempotent (upsert on name; markers backfilled only when unset so operator
 * edits survive a re-seed). All profiles.
 */
export async function seedTeams(ctx: SeedContext): Promise<void> {
  ctx.log('🧑‍🤝‍🧑 Seeding Team Categories…');
  // A distinct glyph per crew type (all real render-path glyphs): watering →
  // droplets, maintenance → wrench, planting → sprout, sweeping → flower.
  // `marker_opacity` is seeded VARIED on purpose: a catalog where every row is
  // 100% makes the grid's "Warna" column look like it ignores the setting.
  await ctx.qr.query(
    `INSERT INTO team_categories (name, marker_color, marker_opacity, marker_icon) VALUES
       ('Perawatan',  '#7FBC8C', 1,    'wrench'),
       ('Penyiraman', '#69D2E7', 0.8,  'droplets'),
       ('Penanaman',  '#15803D', 0.65, 'sprout'),
       ('Penyapuan',  '#E3A018', 0.9,  'flower')
     ON CONFLICT (name) DO UPDATE SET
       marker_color = COALESCE(team_categories.marker_color, EXCLUDED.marker_color),
       marker_opacity = COALESCE(team_categories.marker_opacity, EXCLUDED.marker_opacity),
       marker_icon = COALESCE(team_categories.marker_icon, EXCLUDED.marker_icon)`,
  );
  ctx.log('  ✓ Seeded 4 team categories (marker colour + opacity + glyph)');
}
