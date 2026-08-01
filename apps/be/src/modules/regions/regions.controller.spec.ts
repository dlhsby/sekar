import { RegionsController } from './regions.controller';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator';

/**
 * `PermissionsGuard` is a NO-OP on a handler that carries no permission
 * metadata, so a new route on this controller is public-to-any-logged-in-user
 * unless it declares one. `GET /regions/lookup` shipped that way and silently
 * widened kawasan enumeration to every role — including satgas — while the
 * `GET /regions` it replaced on the schedules page required `region:read`.
 *
 * Every read route here must therefore be pinned.
 */
describe('RegionsController — permission metadata', () => {
  const permissionsOf = (handler: keyof RegionsController): string[] | undefined =>
    Reflect.getMetadata(PERMISSIONS_KEY, RegionsController.prototype[handler] as object);

  it.each([
    ['findAll' as const, 'region:read'],
    ['findAllForLookup' as const, 'region:read'],
    ['findOne' as const, 'region:read'],
  ])('%s requires %s', (handler, permission) => {
    expect(permissionsOf(handler)).toContain(permission);
  });
});
