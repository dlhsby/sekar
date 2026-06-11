/**
 * Audit-trail completeness contract (Phase 4-4 C2).
 *
 * Source-level guard: every service that owns a business-critical mutation
 * must inject AuditLogService and write entries. Behavioral coverage lives in
 * each module's own spec; this test prevents the wiring from silently
 * disappearing in a refactor (the failure mode C2 exists to catch).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const MODULES_DIR = join(__dirname, '..');

/** service file → mutation domain that must stay audit-logged */
const AUDITED_SERVICES: { file: string; domain: string }[] = [
  { file: 'shifts/shifts.service.ts', domain: 'clock-in/out' },
  { file: 'tasks/tasks.service.ts', domain: 'task lifecycle' },
  { file: 'activities/activities.service.ts', domain: 'activity submit/review' },
  { file: 'overtime/overtime.service.ts', domain: 'overtime lifecycle' },
  { file: 'users/users.service.ts', domain: 'account create/update/deactivate' },
  { file: 'monitoring/services/monitoring-reassign.service.ts', domain: 'worker reassignment' },
];

describe('Audit trail completeness (4-4 C2)', () => {
  it.each(AUDITED_SERVICES)('$file keeps the $domain mutations audit-logged', ({ file }) => {
    const source = readFileSync(join(MODULES_DIR, file), 'utf8');

    expect(source).toContain('AuditLogService');
    // At least one actual write — injection alone is not coverage
    expect(source).toMatch(/auditLogService\s*\n?\s*\.log\(|auditLogService\.log\(|this\.audit\(/);
  });

  it('users.service audits all three account mutations', () => {
    const source = readFileSync(join(MODULES_DIR, 'users/users.service.ts'), 'utf8');
    for (const action of ["'create'", "'update'", "'deactivate'"]) {
      expect(source).toContain(`action: ${action}`);
    }
  });
});
