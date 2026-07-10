import type { SeedContext } from '../lib/context';
import { ROLE_SEEDS } from '../../../modules/rbac/catalog/role-seeds';

/**
 * Seed the 9 system roles + their default permission grants (ADR-044).
 *
 * - Role rows are upserted on `code` (name/scope/marker reconciled every run so
 *   labels/markers stay current).
 * - Permission grants are seeded ONLY when a role has none yet, so operator
 *   edits made via the role-management UI are never clobbered on re-deploy.
 * - Run AFTER seedPermissions (grants reference permission rows by key).
 * Idempotent; safe for dev and staging.
 */
export async function seedRoles(ctx: SeedContext): Promise<void> {
  ctx.log('👥 Seeding Roles…');

  for (const r of ROLE_SEEDS) {
    await ctx.qr.query(
      `INSERT INTO roles (code, name, description, is_system, monitoring_scope, marker_icon, marker_color)
       VALUES ($1, $2, $3, TRUE, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_system = TRUE,
         monitoring_scope = EXCLUDED.monitoring_scope,
         marker_icon = EXCLUDED.marker_icon,
         marker_color = EXCLUDED.marker_color`,
      [r.code, r.name, r.description, r.monitoring_scope, r.marker_icon, r.marker_color],
    );

    const roleRows = (await ctx.qr.query(`SELECT id FROM roles WHERE code = $1`, [
      r.code,
    ])) as Array<{
      id: string;
    }>;
    const roleId = roleRows[0]?.id;
    if (!roleId) continue;

    const countRows = (await ctx.qr.query(
      `SELECT COUNT(*)::int AS count FROM role_permissions WHERE role_id = $1`,
      [roleId],
    )) as Array<{ count: number }>;
    if ((countRows[0]?.count ?? 0) > 0) {
      continue; // Operator-owned once granted — don't clobber edits.
    }

    for (const key of r.permissions) {
      await ctx.qr.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p WHERE p.key = $2
         ON CONFLICT DO NOTHING`,
        [roleId, key],
      );
    }
  }

  ctx.log(`  ✓ Upserted ${ROLE_SEEDS.length} system roles + default grants`);
}
