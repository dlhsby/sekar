import type { SeedContext } from '../lib/context';
import {
  PERMISSION_CATALOG,
  flattenCatalog,
} from '../../../modules/rbac/catalog/permission-catalog';

/**
 * Seed the permission catalog (ADR-044): every concrete `resource:action` key
 * plus the wildcard rows (`*:*`, `resource:*`) that seed roles reference.
 * Idempotent — `ON CONFLICT (key)` upserts the description, never duplicates.
 * Safe for dev and staging.
 */
export async function seedPermissions(ctx: SeedContext): Promise<void> {
  ctx.log('🔐 Seeding Permissions…');

  const rows: Array<{ key: string; description: string }> = flattenCatalog().map((p) => ({
    key: p.key,
    description: p.description,
  }));

  // Wildcard permission rows (expanded at check time by the matcher).
  rows.push({ key: '*:*', description: 'Semua izin' });
  for (const cat of PERMISSION_CATALOG) {
    for (const res of cat.resources) {
      rows.push({ key: `${res.resource}:*`, description: `Semua aksi ${res.label}` });
    }
  }

  for (const row of rows) {
    await ctx.qr.query(
      `INSERT INTO permissions (key, description) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description`,
      [row.key, row.description],
    );
  }

  ctx.log(`  ✓ Upserted ${rows.length} permissions`);
}
