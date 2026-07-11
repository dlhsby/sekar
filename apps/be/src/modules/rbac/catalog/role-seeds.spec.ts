import { ROLE_SEEDS } from './role-seeds';
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG } from './permission-catalog';

/**
 * Guards the seed data: every permission key a role seed references must be a
 * key the permission seeder actually creates — a concrete catalog key, the
 * global `*:*`, or a `resource:*` wildcard for a known resource. A typo here
 * would silently grant nothing (the seeder's SELECT-by-key finds no row), so we
 * assert it at build time instead of discovering it in production.
 */
describe('role-seeds consistency', () => {
  const concrete = new Set(ALL_PERMISSION_KEYS);
  const resources = new Set(PERMISSION_CATALOG.flatMap((c) => c.resources.map((r) => r.resource)));

  const isSeedable = (key: string): boolean => {
    if (key === '*:*') return true;
    if (concrete.has(key)) return true;
    const [res, act] = key.split(':');
    if (act === '*' && resources.has(res)) return true; // resource:* wildcard
    return false;
  };

  it('every role-seed permission key is seedable', () => {
    const bad: string[] = [];
    for (const role of ROLE_SEEDS) {
      for (const key of role.permissions) {
        if (!isSeedable(key)) bad.push(`${role.code} → ${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('seeds all 9 system roles with unique codes', () => {
    const codes = ROLE_SEEDS.map((r) => r.code);
    expect(codes).toHaveLength(9);
    expect(new Set(codes).size).toBe(9);
  });

  it('every seed role has a marker icon', () => {
    const bad = ROLE_SEEDS.filter((r) => !r.marker_icon || r.marker_icon.length === 0);
    expect(bad.map((r) => r.code)).toEqual([]);
  });

  it('every seed role has a valid #RRGGBB accent colour', () => {
    const bad = ROLE_SEEDS.filter((r) => !/^#[0-9A-Fa-f]{6}$/.test(r.marker_color));
    expect(bad.map((r) => r.code)).toEqual([]);
  });

  it('satgas and linmas have no monitoring access', () => {
    for (const code of ['satgas', 'linmas']) {
      const role = ROLE_SEEDS.find((r) => r.code === code)!;
      expect(role.monitoring_scope).toBe('none');
      expect(role.permissions.some((p) => p.startsWith('monitoring:'))).toBe(false);
    }
  });
});
