import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DailySchedulesController } from './daily-schedules.controller';
import { DailySchedulesService } from './daily-schedules.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('DailySchedulesController (rayon scoping)', () => {
  let controller: DailySchedulesController;
  let service: {
    findByDate: jest.Mock;
    findByUserAndDate: jest.Mock;
    findOne: jest.Mock;
    setLeave: jest.Mock;
    generateRoster: jest.Mock;
  };

  const kepala = { id: 'k1', role: UserRole.KEPALA_RAYON, rayon_id: 'r1' } as unknown as User;
  const admin = { id: 'a1', role: UserRole.SUPERADMIN, rayon_id: null } as unknown as User;

  beforeEach(async () => {
    service = {
      findByDate: jest.fn().mockResolvedValue([]),
      findByUserAndDate: jest.fn().mockResolvedValue(null),
      findOne: jest.fn(),
      setLeave: jest.fn().mockResolvedValue({}),
      generateRoster: jest.fn().mockResolvedValue(3),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailySchedulesController],
      providers: [{ provide: DailySchedulesService, useValue: service }],
    }).compile();
    controller = module.get(DailySchedulesController);
  });

  it('forces a kepala_rayon to its own rayon, ignoring the query', async () => {
    await controller.getByDate('2026-06-30', kepala, 'r2');
    expect(service.findByDate).toHaveBeenCalledWith('2026-06-30', 'r1');
  });

  it('lets a global admin pass an explicit rayon filter', async () => {
    await controller.getByDate('2026-06-30', admin, 'r2');
    expect(service.findByDate).toHaveBeenCalledWith('2026-06-30', 'r2');
  });

  it('returns nothing for a rayon-scoped user with no rayon_id (no leak)', async () => {
    const scopedNoRayon = {
      id: 'k2',
      role: UserRole.KEPALA_RAYON,
      rayon_id: null,
    } as unknown as User;
    const result = await controller.getByDate('2026-06-30', scopedNoRayon, 'r2');
    expect(result).toEqual([]);
    expect(service.findByDate).not.toHaveBeenCalled();
  });

  it('blocks a scoped role from editing a row in a different rayon', async () => {
    service.findOne.mockResolvedValue({ id: 'd1', rayon_id: 'r2' });
    await expect(controller.setLeave('d1', { leave_type: 'sick' }, kepala)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.setLeave).not.toHaveBeenCalled();
  });

  it('allows a scoped role to edit a row in its own rayon', async () => {
    service.findOne.mockResolvedValue({ id: 'd1', rayon_id: 'r1' });
    await controller.setLeave('d1', { leave_type: 'sick', notes: 'x' }, kepala);
    expect(service.setLeave).toHaveBeenCalledWith('d1', 'sick', 'x', 'k1');
  });
});
