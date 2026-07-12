import type { SeedContext } from '../lib/context';

/**
 * Seed the team-type catalog (ADR-048, amended): the crew-type categories with
 * their map marker + bubble colour. Concrete teams (name/PIC/members) are
 * defined per schedule event — there is no standing `teams` table anymore.
 * Idempotent (upsert on name; markers backfilled only when unset so operator
 * edits survive a re-seed). All profiles.
 */
export async function seedTeams(ctx: SeedContext): Promise<void> {
  ctx.log('🧑‍🤝‍🧑 Seeding Team Types…');
  await ctx.qr.query(
    `INSERT INTO team_types (name, marker_image_url, marker_color) VALUES
       ('Perawatan',  '/markers/pin-sage.svg',   '#7FBC8C'),
       ('Penyiraman', '/markers/pin-teal.svg',   '#69D2E7'),
       ('Penanaman',  '/markers/pin-green.svg', '#15803D'),
       ('Penyapuan',  '/markers/pin-yellow.svg',  '#E3A018')
     ON CONFLICT (name) DO UPDATE SET
       marker_image_url = COALESCE(team_types.marker_image_url, EXCLUDED.marker_image_url),
       marker_color = COALESCE(team_types.marker_color, EXCLUDED.marker_color)`,
  );
  ctx.log('  ✓ Seeded 4 team types (marker + bubble colour)');
}
