import { NotFoundException } from '@nestjs/common';
import { DeletionService } from './deletion.service';
import { DELETE_PLANS } from './deletion-plans';
import type { User } from '../users/entities/user.entity';

/**
 * Guard rules of the force delete. The cascade itself runs against a real DB
 * in test/force-delete.e2e-spec.ts; here the plans are stubbed so each refusal
 * path is pinned without SQL.
 */
describe('DeletionService', () => {
  const admin = { id: 'admin-1', role: 'admin_system' } as User;
  let manager: { findOne: jest.Mock; query: jest.Mock };
  let auditLog: { log: jest.Mock };
  let perms: { getRolePermissionKeys: jest.Mock };
  let service: DeletionService;
  const original = { ...DELETE_PLANS.location };
  const originalRole = { ...DELETE_PLANS.role };

  beforeEach(() => {
    manager = { findOne: jest.fn(), query: jest.fn() };
    auditLog = { log: jest.fn().mockResolvedValue({ id: 'root-1' }) };
    perms = { getRolePermissionKeys: jest.fn().mockResolvedValue(['*:*']) };
    const dataSource = {
      manager,
      transaction: (fn: (m: unknown) => unknown) => fn(manager),
    };
    service = new DeletionService(dataSource as never, auditLog as never, perms as never);

    Object.assign(DELETE_PLANS.location, {
      impact: jest.fn().mockResolvedValue({ future_schedules: 2 }),
      execute: jest.fn().mockResolvedValue({ future_schedules: 2 }),
    });
  });

  afterEach(() => {
    Object.assign(DELETE_PLANS.location, original);
    Object.assign(DELETE_PLANS.role, originalRole);
  });

  const dto = (confirm_name: string) => ({ confirm_name, reason: 'Ditutup permanen' });

  it('404s an unknown record', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.impact('location', 'x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires the per-type delete permission', async () => {
    perms.getRolePermissionKeys.mockResolvedValue(['area:read']);
    await expect(service.impact('location', 'l-1', admin)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('refuses a mismatched confirmation and writes nothing', async () => {
    manager.findOne.mockResolvedValue({ id: 'l-1', name: 'Taman Bungkul' });
    await expect(
      service.forceDelete('location', 'l-1', dto('Taman Lain'), admin),
    ).rejects.toMatchObject({
      code: 'DELETE_CONFIRMATION_MISMATCH',
    });
    expect(auditLog.log).not.toHaveBeenCalled();
    expect(DELETE_PLANS.location.execute).not.toHaveBeenCalled();
  });

  it('accepts a confirmation that differs only in case and spacing', async () => {
    manager.findOne.mockResolvedValue({ id: 'l-1', name: 'Taman  Bungkul' });
    const res = await service.forceDelete('location', 'l-1', dto('  taman bungkul '), admin);
    expect(res).toMatchObject({ audit_id: 'root-1', impact: { future_schedules: 2 } });
  });

  it('writes the root audit row with the reason before the cascade', async () => {
    manager.findOne.mockResolvedValue({ id: 'l-1', name: 'Taman Bungkul' });
    await service.forceDelete('location', 'l-1', dto('Taman Bungkul'), admin);
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'location',
        entity_id: 'l-1',
        action: 'force_delete',
        metadata: { planned: { future_schedules: 2 }, replacement_id: null },
      }),
      manager,
    );
  });

  it.each([
    ['your own account', 'user', { id: 'admin-1', username: 'me' }, 'me'],
    ['a system role', 'role', { id: 'r-1', name: 'Satgas', is_system: true }, 'Satgas'],
    [
      'a superadmin, unless you are one',
      'user',
      { id: 'u-9', username: 'root', role: 'superadmin' },
      'root',
    ],
  ] as const)('refuses to delete %s', async (_l, type, row, confirm) => {
    manager.findOne.mockResolvedValue(row);
    await expect(service.forceDelete(type, row.id, dto(confirm), admin)).rejects.toMatchObject({
      code: 'DELETE_NOT_ALLOWED',
    });
  });

  it('requires a valid replacement while dependants exist', async () => {
    Object.assign(DELETE_PLANS.role, {
      impact: jest.fn().mockResolvedValue({ users_moved: 3 }),
      needsReplacement: jest.fn().mockResolvedValue(3),
      execute: jest.fn().mockResolvedValue({ users_moved: 3 }),
    });
    manager.findOne.mockResolvedValueOnce({ id: 'r-1', name: 'Peran Uji', is_system: false });
    await expect(service.forceDelete('role', 'r-1', dto('Peran Uji'), admin)).rejects.toMatchObject(
      {
        code: 'DELETE_REPLACEMENT_REQUIRED',
      },
    );

    // Replacing a role with itself is not a replacement.
    manager.findOne.mockResolvedValue({ id: 'r-1', name: 'Peran Uji', is_system: false });
    await expect(
      service.forceDelete('role', 'r-1', { ...dto('Peran Uji'), replacement_id: 'r-1' }, admin),
    ).rejects.toMatchObject({ code: 'DELETE_REPLACEMENT_REQUIRED' });
  });
});
