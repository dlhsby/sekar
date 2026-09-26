import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
} from '../auth/decorators/require-permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { DistrictsController } from '../districts/districts.controller';
import { RegionsController } from '../regions/regions.controller';
import { LocationsController } from '../locations/locations.controller';
import { LocationTypesController } from '../location-types/location-types.controller';
import { TeamsController } from '../teams/teams.controller';
import { UsersController } from '../users/users.controller';
import { ShiftDefinitionsController } from '../shift-definitions/shift-definitions.controller';
import { SpecialDayOverridesController } from '../special-day-overrides/special-day-overrides.controller';
import { LocationStaffRequirementsController } from '../location-staff-requirements/location-staff-requirements.controller';
import {
  RegionStaffRequirementsController,
  DistrictStaffRequirementsController,
} from '../location-staff-requirements/subject-staff-requirements.controller';
import { flattenCatalog } from './catalog/permission-catalog';

/**
 * Master-data writes are permission-driven (fix/master-data-crud). The web
 * gates buttons with `can('<resource>:<action>')`; if a backend write route
 * drifts back to a hardcoded `@Roles(...)` list, the two disagree and users see
 * a button that 403s — the class of bug this suite exists to prevent.
 */
type Ctor = { prototype: object; name: string };

const WRITE_METHODS = new Set([
  RequestMethod.POST,
  RequestMethod.PATCH,
  RequestMethod.PUT,
  RequestMethod.DELETE,
]);

// Self-service routes gated by identity, not by a catalog permission.
const SELF_SERVICE = new Set([
  'UsersController.updateOwnProfile',
  'UsersController.changePassword',
  'UsersController.uploadProfilePicture',
]);

const CONTROLLERS: Array<[Ctor, string]> = [
  [DistrictsController, 'district'],
  [RegionsController, 'region'],
  [LocationsController, 'area'],
  [LocationTypesController, 'area'],
  [TeamsController, 'team'],
  [UsersController, 'user'],
  [ShiftDefinitionsController, 'shift-definition'],
  [SpecialDayOverridesController, 'holiday'],
  // Capacity (Kapasitas) is an attribute of its tier → that tier's update permission.
  [LocationStaffRequirementsController, 'area'],
  [RegionStaffRequirementsController, 'region'],
  [DistrictStaffRequirementsController, 'district'],
];

function writeHandlers(ctor: Ctor): string[] {
  const proto = ctor.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto).filter((name) => {
    const fn = proto[name];
    if (typeof fn !== 'function' || name === 'constructor') return false;
    const method = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod | undefined;
    return method !== undefined && WRITE_METHODS.has(method);
  });
}

function permissionsOf(ctor: Ctor, handler: string): string[] {
  const fn = (ctor.prototype as Record<string, object>)[handler];
  return [
    ...((Reflect.getMetadata(PERMISSIONS_KEY, fn) as string[] | undefined) ?? []),
    ...((Reflect.getMetadata(ANY_PERMISSIONS_KEY, fn) as string[] | undefined) ?? []),
  ];
}

describe('Master-data write routes — permission metadata', () => {
  const catalogKeys = new Set(flattenCatalog().map((p) => p.key));

  const cases = CONTROLLERS.flatMap(([ctor, resource]) =>
    writeHandlers(ctor)
      .filter((h) => !SELF_SERVICE.has(`${ctor.name}.${h}`))
      .map((h) => [`${ctor.name}.${h}`, ctor, h, resource] as const),
  );

  it('finds write handlers to check', () => {
    expect(cases.length).toBeGreaterThan(25);
  });

  it.each(cases)(
    '%s requires a %s-scoped catalog permission',
    (_label, ctor, handler, resource) => {
      const perms = permissionsOf(ctor, handler);
      expect(perms.length).toBeGreaterThan(0);
      for (const p of perms) {
        expect(p.startsWith(`${resource}:`)).toBe(true);
        expect(catalogKeys.has(p)).toBe(true);
      }
    },
  );

  it.each(cases)('%s carries no hardcoded @Roles list', (_label, ctor, handler) => {
    const fn = (ctor.prototype as Record<string, object>)[handler];
    expect(Reflect.getMetadata(ROLES_KEY, fn)).toBeUndefined();
  });
});
