import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShiftReminderCron } from './shift-reminder.cron';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';

describe('ShiftReminderCron', () => {
  let cron: ShiftReminderCron;
  let sendToUser: jest.Mock;
  let redisSet: jest.Mock;
  let getRawMany: jest.Mock;

  // A schedule whose shift starts at 06:00 (360 min).
  const row = {
    user_id: 'user-1',
    area_id: 'area-1',
    shift_definition_id: 'shift-1',
    shift_name: 'Pagi',
    start_time: '06:00:00',
  };

  beforeEach(async () => {
    getRawMany = jest.fn().mockResolvedValue([row]);
    sendToUser = jest.fn().mockResolvedValue(undefined);
    redisSet = jest.fn().mockResolvedValue('OK');

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftReminderCron,
        {
          provide: getRepositoryToken(Schedule),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        },
        { provide: NotificationsService, useValue: { sendToUser } },
        { provide: RedisService, useValue: { getClient: () => ({ set: redisSet }) } },
      ],
    }).compile();

    cron = module.get(ShiftReminderCron);
  });

  afterEach(() => jest.clearAllMocks());

  // 05:45 Asia/Jakarta == 22:45 UTC the previous day. delta to 06:00 == 15 min.
  const at0545Jakarta = new Date('2026-06-09T22:45:00.000Z');

  it('sends a SHIFT_REMINDER for a shift starting within the 15-min window', async () => {
    const count = await cron.sendDueReminders(at0545Jakarta);

    expect(count).toBe(1);
    expect(sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: NotificationType.SHIFT_REMINDER,
        data: { shift_definition_id: 'shift-1', area_id: 'area-1' },
      }),
    );
  });

  it('uses the Jakarta calendar date in the dedup key', async () => {
    await cron.sendDueReminders(at0545Jakarta);
    expect(redisSet).toHaveBeenCalledWith(
      'shift-reminder:2026-06-10:user-1:shift-1',
      '1',
      'EX',
      86400,
      'NX',
    );
  });

  it('does NOT send when the shift is outside the window (e.g. 1 hour away)', async () => {
    // 05:00 Jakarta == 22:00 UTC prev day; delta to 06:00 == 60 min (> 15).
    const count = await cron.sendDueReminders(new Date('2026-06-09T22:00:00.000Z'));
    expect(count).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('skips the send when the dedup claim is already taken', async () => {
    redisSet.mockResolvedValue(null); // key already exists
    const count = await cron.sendDueReminders(at0545Jakarta);
    expect(count).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('fails safe (no send) when Redis errors', async () => {
    redisSet.mockRejectedValue(new Error('redis down'));
    const count = await cron.sendDueReminders(at0545Jakarta);
    expect(count).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
  });
});
