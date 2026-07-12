import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermissionsService } from './role-permissions.service';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: any;
  let permissionRepo: any;
  let rolePermissions: { invalidateRole: jest.Mock };

  beforeEach(() => {
    roleRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'new-id', ...v })),
      softRemove: jest.fn().mockResolvedValue(undefined),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    permissionRepo = { find: jest.fn().mockResolvedValue([]) };
    rolePermissions = { invalidateRole: jest.fn().mockResolvedValue(undefined) };
    service = new RolesService(
      roleRepo as unknown as any,
      permissionRepo as unknown as any,
      rolePermissions as unknown as RolePermissionsService,
    );
  });

  describe('create', () => {
    it('slugifies the name into a unique code and defaults is_system=false', async () => {
      roleRepo.findOne
        .mockResolvedValueOnce(null) // code availability check
        .mockResolvedValueOnce({
          // findOne(id) inside the trailing findOne() view fetch
          id: 'new-id',
          code: 'pengawas_taman',
          name: 'Pengawas Taman',
          is_system: false,
          monitoring_scope: 'none',
          permissions: [],
          created_at: new Date(),
          updated_at: new Date(),
        });

      const view = await service.create({ name: 'Pengawas Taman!' }, 'actor-1');

      expect(view.code).toBe('pengawas_taman');
      expect(view.is_system).toBe(false);
      const created = roleRepo.create.mock.calls[0][0];
      expect(created.code).toBe('pengawas_taman');
      expect(created.is_system).toBe(false);
    });

    it('persists the accent colour when provided', async () => {
      roleRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'new-id',
        code: 'pengawas_taman',
        name: 'Pengawas Taman',
        is_system: false,
        monitoring_scope: 'none',
        marker_color: '#123ABC',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date(),
      });

      const view = await service.create(
        { name: 'Pengawas Taman', marker_color: '#123ABC' },
        'actor-1',
      );

      expect(roleRepo.create.mock.calls[0][0].marker_color).toBe('#123ABC');
      expect(view.marker_color).toBe('#123ABC');
    });
  });

  describe('resolvePermissions (via update)', () => {
    it('rejects unknown permission keys', async () => {
      roleRepo.findOne.mockResolvedValue({
        id: 'r1',
        code: 'korlap',
        permissions: [],
      });
      permissionRepo.find.mockResolvedValue([{ key: 'monitoring:read' } as Permission]);

      await expect(
        service.update('r1', { permissionKeys: ['monitoring:read', 'bogus:key'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('invalidates the role cache after a successful update', async () => {
      const role = { id: 'r1', code: 'korlap', permissions: [] } as unknown as Role;
      roleRepo.findOne
        .mockResolvedValueOnce(role) // load for update
        .mockResolvedValueOnce({
          id: 'r1',
          code: 'korlap',
          name: 'Korlap',
          is_system: true,
          monitoring_scope: 'region',
          permissions: [],
          created_at: new Date(),
          updated_at: new Date(),
        }); // trailing view fetch

      await service.update('r1', { name: 'Korlap Baru' }, 'actor-1');
      expect(rolePermissions.invalidateRole).toHaveBeenCalledWith('korlap');
    });
  });

  describe('remove', () => {
    it('throws NotFound for a missing role', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to delete a system role', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'satgas', is_system: true });
      await expect(service.remove('r1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to delete a role that is assigned to users', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'custom', is_system: false });
      roleRepo.manager.query.mockResolvedValue([{ count: 3 }]);
      await expect(service.remove('r1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('soft-removes an unused custom role and invalidates cache', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'custom', is_system: false });
      roleRepo.manager.query.mockResolvedValue([{ count: 0 }]);
      await service.remove('r1');
      expect(roleRepo.softRemove).toHaveBeenCalled();
      expect(rolePermissions.invalidateRole).toHaveBeenCalledWith('custom');
    });
  });
});
