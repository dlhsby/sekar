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
import { auditableOptions, auditableTypes, type EntityClass } from './capture/auditable.decorator';
import { District } from '../districts/entities/district.entity';
import { Region } from '../regions/entities/region.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationType } from '../location-types/entities/location-type.entity';
import { TeamCategory } from '../teams/entities/team-category.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { SpecialDayOverride } from '../special-day-overrides/entities/special-day-override.entity';
import { LocationStaffRequirement } from '../location-staff-requirements/entities/location-staff-requirement.entity';

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
});

/**
 * ADR-061: CRUD on master data and accounts is captured automatically by the
 * AuditTrailSubscriber — but only for writes that fire entity events
 * (save / softRemove / recover / remove). A `repository.update()`,
 * `softDelete()` or QueryBuilder `.update()` in these services would change
 * data with NO audit row. Such a write is allowed only when the line directly
 * above it carries an `// audit: explicit` note pointing at the explicit event
 * that records it (e.g. a bulk re-parent logged once on the parent).
 */
const AUTO_CAPTURED: Array<{ entity: EntityClass; type: string; service: string }> = [
  { entity: District, type: 'district', service: 'districts/districts.service.ts' },
  { entity: Region, type: 'region', service: 'regions/regions.service.ts' },
  { entity: Location, type: 'location', service: 'locations/locations.service.ts' },
  {
    entity: LocationType,
    type: 'location_type',
    service: 'location-types/location-types.service.ts',
  },
  { entity: TeamCategory, type: 'team_category', service: 'teams/teams.service.ts' },
  { entity: User, type: 'user', service: 'users/users.service.ts' },
  { entity: Role, type: 'role', service: 'rbac/services/roles.service.ts' },
  {
    entity: ShiftDefinition,
    type: 'shift_definition',
    service: 'shift-definitions/shift-definitions.service.ts',
  },
  {
    entity: SpecialDayOverride,
    type: 'special_day_override',
    service: 'special-day-overrides/special-day-overrides.service.ts',
  },
  {
    entity: LocationStaffRequirement,
    type: 'staff_requirement',
    service: 'location-staff-requirements/location-staff-requirements.service.ts',
  },
];

// QueryBuilder `.update()` / `.update(Entity)` / `.delete()` and repository
// `update/delete/softDelete/restore` all bypass entity events.
const EVENTLESS_WRITE =
  /\.softDelete\(|\.restore\(|Repo(?:sitory)?\.update\(|Repo(?:sitory)?\.delete\(|\.update\((?:\)|[A-Z])|\.delete\((?:\)|[A-Z])/;

describe('Automatic CRUD capture (ADR-061)', () => {
  it.each(AUTO_CAPTURED)('$type is @Auditable', ({ entity, type }) => {
    expect(auditableOptions(entity)?.type).toBe(type);
  });

  it('every auditable type is covered by this contract', () => {
    expect(auditableTypes()).toEqual(AUTO_CAPTURED.map((c) => c.type).sort());
  });

  it.each(AUTO_CAPTURED)('$service has no un-annotated event-less write', ({ service }) => {
    const lines = readFileSync(join(MODULES_DIR, service), 'utf8').split('\n');
    const offending = lines
      .map((line, i) => ({ line: line.trim(), n: i + 1, prev: lines[i - 1] ?? '' }))
      .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*'))
      .filter(({ line, prev }) => EVENTLESS_WRITE.test(line) && !/audit: explicit/.test(prev))
      .map(({ n, line }) => `${service}:${n}  ${line}`);
    expect(offending).toEqual([]);
  });
});
