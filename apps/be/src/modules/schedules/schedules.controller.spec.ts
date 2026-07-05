import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('SchedulesController (rayon scoping)', () => {
  let controller: SchedulesController;
  let service: {
    findByDate: jest.Mock;
    findByUserAndDate: jest.Mock;
    findOne: jest.Mock;
    setLeave: jest.Mock;
    generateRoster: jest.Mock;
    addForDay: jest.Mock;
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
      addForDay: jest.fn().mockResolvedValue({ id: 'new' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [{ provide: SchedulesService, useValue: service }],
    }).compile();
    controller = module.get(SchedulesController);
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

  // The fine-grained edit permission (role hierarchy + rayon/area scope) now
  // lives in SchedulesService.assertCanEdit — the controller just delegates,
  // passing the full editing user. See schedules.service.spec for the matrix.
  it('delegates setLeave to the service with the editing user', async () => {
    await controller.setLeave('d1', { leave_type: 'sick', notes: 'x' }, kepala);
    expect(service.setLeave).toHaveBeenCalledWith('d1', 'sick', 'x', kepala);
  });

  it('delegates addSchedule to the service with the editing user', async () => {
    const dto = { user_id: 'W', date: '2026-07-04' };
    await controller.addSchedule(dto, kepala);
    expect(service.addForDay).toHaveBeenCalledWith(dto, kepala);
  });
});
