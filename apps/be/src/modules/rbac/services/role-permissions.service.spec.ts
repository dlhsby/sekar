import { Repository } from 'typeorm';
import { RolePermissionsService } from './role-permissions.service';
import { Role } from '../entities/role.entity';
import { RedisService } from '../../../common/services/redis.service';

/**
 * The permission cache must fail open FAST: ioredis queues commands while
 * disconnected and only rejects after its retries (~4.5 s each), so without a
 * readiness check every permission-guarded request stalled ~9 s whenever Redis
 * was down (found when CI — which has no Redis — timed out on master-data writes).
 */
describe('RolePermissionsService', () => {
  const role = { code: 'admin_system', permissions: [{ key: 'district:create' }] } as Role;

  const build = (ready: boolean, cached: string | null = null) => {
    const client = {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    const redis = {
      isReady: jest.fn().mockReturnValue(ready),
      getClient: jest.fn().mockReturnValue(client),
    } as unknown as RedisService;
    const roleRepo = {
      findOne: jest.fn().mockResolvedValue(role),
    } as unknown as Repository<Role>;
    return { service: new RolePermissionsService(roleRepo, redis), client, roleRepo };
  };

  it('skips Redis entirely and reads the DB when the client is not ready', async () => {
    const { service, client, roleRepo } = build(false);

    await expect(service.getRolePermissionKeys('admin_system')).resolves.toEqual([
      'district:create',
    ]);
    expect(client.get).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalled();
    expect(roleRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it('serves from the cache when Redis is ready and holds the keys', async () => {
    const { service, roleRepo } = build(true, JSON.stringify(['audit:read']));

    await expect(service.getRolePermissionKeys('admin_system')).resolves.toEqual(['audit:read']);
    expect(roleRepo.findOne).not.toHaveBeenCalled();
  });

  it('fills the cache after a miss when Redis is ready', async () => {
    const { service, client } = build(true, null);

    await service.getRolePermissionKeys('admin_system');
    expect(client.set).toHaveBeenCalledWith(
      'rbac:role:admin_system:permissions',
      JSON.stringify(['district:create']),
      'EX',
      300,
    );
  });

  it('still falls back to the DB when a ready client errors', async () => {
    const { service, client } = build(true);
    client.get.mockRejectedValue(new Error('boom'));

    await expect(service.getRolePermissionKeys('admin_system')).resolves.toEqual([
      'district:create',
    ]);
  });
});
