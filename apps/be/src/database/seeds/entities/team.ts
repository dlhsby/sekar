import type { SeedContext } from '../lib/context';

/**
 * Seed the team-type catalog (ADR-048) — idempotent, all profiles — plus a
 * couple of sample teams in demo only. Run any time after truncate.
 */
export async function seedTeams(ctx: SeedContext): Promise<void> {
  ctx.log('🧑‍🤝‍🧑 Seeding Team Types…');
  await ctx.qr.query(
    `INSERT INTO team_types (name) VALUES ('Perawatan'), ('Penyiraman'), ('Penanaman'), ('Penyapuan')
     ON CONFLICT (name) DO NOTHING`,
  );

  if (ctx.mode !== 'demo') return;

  const rows = (await ctx.qr.query(
    `SELECT id, name FROM team_types WHERE name IN ('Penyiraman', 'Perawatan')`,
  )) as Array<{ id: string; name: string }>;
  const byName = new Map(rows.map((r) => [r.name, r.id]));
  const penyiraman = byName.get('Penyiraman');
  const perawatan = byName.get('Perawatan');
  if (!penyiraman || !perawatan) return;

  await ctx.qr.query(
    `INSERT INTO teams (id, name, team_type_id, marker_icon, marker_image_url) VALUES
       ('b2b2b2b2-0000-4000-8000-000000000001', 'Tim Penyiraman A', $1, 'droplets', '/markers/pin-teal.svg'),
       ('b2b2b2b2-0000-4000-8000-000000000002', 'Tim Perawatan A', $2, 'trees', '/markers/pin-sage.svg')
     ON CONFLICT (id) DO NOTHING`,
    [penyiraman, perawatan],
  );
  ctx.log('  ✓ Seeded 4 team types + 2 sample teams');
}
