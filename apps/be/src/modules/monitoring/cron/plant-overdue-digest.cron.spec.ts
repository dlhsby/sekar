import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlantOverdueDigestCron } from './plant-overdue-digest.cron';
import { AreaPlantStatusService } from '../services/area-plant-status.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';
import { User, UserRole } from '../../users/entities/user.entity';

describe('PlantOverdueDigestCron', () => {
  let cron: PlantOverdueDigestCron;
  let userRepository: { find: jest.Mock };
  let statusService: { getSummary: jest.Mock };
  let notifications: { sendToUser: jest.Mock };
  let redisSet: jest.Mock;

  const RAYON_A = 'rayon-a';
  const RAYON_B = 'rayon-b';

  const summaryWithOverdue = {
    generated_at: new Date(),
    rayons: [
      {
        rayon_id: RAYON_A,
        rayon_name: 'Rayon Selatan',
        ok: 4,
        due_soon: 1,
        overdue: 3,
        unknown: 0,
        overdue_areas: [{ location_id: 'a1', location_name: 'Taman Bungkul', overdue: 3 }],
      },
      {
        rayon_id: RAYON_B,
        rayon_name: 'Rayon Utara',
        ok: 9,
        due_soon: 0,
        overdue: 0,
        unknown: 1,
        overdue_areas: [],
      },
    ],
  };

  const topManagement = {
    id: 'tm-1',
    role: UserRole.MANAGEMENT,
    rayon_id: null,
  } as unknown as User;
  const kepalaA = { id: 'kr-a', role: UserRole.KEPALA_RAYON, rayon_id: RAYON_A } as unknown as User;
  const kepalaB = { id: 'kr-b', role: UserRole.KEPALA_RAYON, rayon_id: RAYON_B } as unknown as User;

  beforeEach(async () => {
    userRepository = { find: jest.fn().mockResolvedValue([topManagement, kepalaA, kepalaB]) };
    statusService = { getSummary: jest.fn().mockResolvedValue(summaryWithOverdue) };
    notifications = { sendToUser: jest.fn().mockResolvedValue({}) };
    redisSet = jest.fn().mockResolvedValue('OK');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantOverdueDigestCron,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: AreaPlantStatusService, useValue: statusService },
        { provide: NotificationsService, useValue: notifications },
        { provide: RedisService, useValue: { getClient: () => ({ set: redisSet }) } },
      ],
    }).compile();

    cron = module.get(PlantOverdueDigestCron);
  });

  it('should send nothing when no rayon has overdue plants', async () => {
    statusService.getSummary.mockResolvedValue({
      generated_at: new Date(),
      rayons: [{ ...summaryWithOverdue.rayons[1] }],
    });

    const sent = await cron.sendDigest();

    expect(sent).toBe(0);
    expect(notifications.sendToUser).not.toHaveBeenCalled();
  });

  it('should digest management for all overdue rayons', async () => {
    await cron.sendDigest();

    const tmCall = notifications.sendToUser.mock.calls.find(
      (c: [{ user_id: string }]) => c[0].user_id === 'tm-1',
    );
    expect(tmCall).toBeDefined();
    expect(tmCall![0]).toMatchObject({
      type: NotificationType.AREA_PLANT_OVERDUE,
      title: 'Tanaman melewati jadwal perantingan',
    });
    expect(tmCall![0].data.rayons).toHaveLength(1); // only rayon A is overdue
  });

  it('should digest kepala_rayon only for their own overdue rayon', async () => {
    const sent = await cron.sendDigest();

    expect(sent).toBe(2); // management + kepala A; kepala B is clean
    const krACall = notifications.sendToUser.mock.calls.find(
      (c: [{ user_id: string }]) => c[0].user_id === 'kr-a',
    );
    expect(krACall![0].body).toContain('Rayon Selatan');
    expect(krACall![0].body).toContain('Taman Bungkul');
    expect(
      notifications.sendToUser.mock.calls.some(
        (c: [{ user_id: string }]) => c[0].user_id === 'kr-b',
      ),
    ).toBe(false);
  });

  it('should dedup per user per day via Redis SET NX', async () => {
    redisSet.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    const sent = await cron.sendDigest(new Date('2026-06-12T01:30:00.000Z'));

    expect(sent).toBe(1);
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^plant-overdue:2026-06-12:/),
      '1',
      'EX',
      86_400,
      'NX',
    );
  });

  it('should fail safe when Redis errors (skip, no duplicate storm)', async () => {
    redisSet.mockRejectedValue(new Error('redis down'));

    const sent = await cron.sendDigest();

    expect(sent).toBe(0);
    expect(notifications.sendToUser).not.toHaveBeenCalled();
  });

  it('run() swallows errors so the scheduler never crashes', async () => {
    statusService.getSummary.mockRejectedValue(new Error('db down'));
    await expect(cron.run()).resolves.toBeUndefined();
  });
});
