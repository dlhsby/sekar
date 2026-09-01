import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Guard: every seed profile that can run against a LIVE database must bootstrap
 * dynamic RBAC (ADR-044).
 *
 * Why this test exists. The migration that creates `roles`, `permissions` and
 * `role_permissions` leaves them EMPTY, and no migration anywhere inserts rows —
 * the seeder is the only source. `RolePermissionsService.getRolePermissionKeys`
 * returns `[]` for a role it cannot find, and `getMonitoringScope` returns NONE.
 * So a deploy that migrates without seeding produces an app that authenticates
 * fine and then 403s every `@RequirePermissions` handler, with every role's
 * monitoring scope silently `none`.
 *
 * That is not hypothetical: `production.ts` shipped without the two calls while
 * `reference.ts` had them, and the staging deploy workflow ran no seeder at all.
 * Nothing caught it, because the failure needs an empty RBAC table to show up and
 * every test database is seeded.
 *
 * These are source-level assertions on purpose. The bug is an OMISSION — a
 * behavioural test would need the profile to be invoked to notice, and the whole
 * point is that the call isn't there to invoke.
 */
describe('seed profiles — RBAC bootstrap (ADR-044)', () => {
  const read = (file: string): string => readFileSync(join(__dirname, file), 'utf8');

  // Profiles that may run against a database holding real data.
  const LIVE_SAFE_PROFILES = ['reference.ts', 'production.ts'];

  describe.each(LIVE_SAFE_PROFILES)('%s', (profile) => {
    const src = read(profile);

    it('seeds permissions before roles (grants reference permission rows by key)', () => {
      const permIdx = src.indexOf('await seedPermissions(');
      const roleIdx = src.indexOf('await seedRoles(');

      expect(permIdx).toBeGreaterThan(-1);
      expect(roleIdx).toBeGreaterThan(-1);
      expect(permIdx).toBeLessThan(roleIdx);
    });

    it('never truncates — it may run against live data', () => {
      expect(src).not.toContain('truncateAll(');
    });
  });

  it('the staging profile also bootstraps RBAC (it is a full reseed)', () => {
    const src = read('staging.ts');
    expect(src).toContain('await seedPermissions(');
    expect(src).toContain('await seedRoles(');
  });

  it('the staging profile is DESTRUCTIVE and must stay clearly marked as such', () => {
    // db:seed:staging wipes every table. It must never be wired into a deploy
    // workflow against a live database — only the reference profile is safe there.
    const src = read('staging.ts');
    expect(src).toContain('truncateAll(');
    expect(src.toLowerCase()).toContain('destructive');
  });

  it('the deploy workflow seeds with the reference profile, never the staging one', () => {
    const workflow = readFileSync(
      join(__dirname, '../../../../../../.github/workflows/deploy-staging.yml'),
      'utf8',
    );

    // Present: the non-destructive bootstrap.
    expect(workflow).toContain('npm run db:seed:prod');
    // Absent: any INVOCATION of the destructive profile. Matched as a run command
    // rather than a bare substring — the workflow deliberately names
    // `db:seed:staging` in a comment warning against it.
    expect(workflow).not.toMatch(/npm run db:seed:staging/);
  });
});
