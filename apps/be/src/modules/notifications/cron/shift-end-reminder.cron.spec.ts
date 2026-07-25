import { Test, TestingModule } from '@nestjs/testing';
import { ShiftEndReminderCron } from './shift-end-reminder.cron';
import { SchedulesService } from '../../schedules/schedules.service';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';

describe('ShiftEndReminderCron', () => {
  let cron: ShiftEndReminderCron;
  let sendToUser: jest.Mock;
  let redisSet: jest.Mock;
  let findByDate: jest.Mock;

  // A same-day shift (ends 15:00) currently under way, with a 10-min end reminder.
  const dayRow = {
    user_id: 'user-1',
    status: ScheduleStatus.PRESENT,
    schedule_date: '2026-06-10',
    shift_definition_id: 'shift-day',
    shift_definition: {
      name: 'Pagi',
      end_time: '15:00:00',
      crosses_midnight: false,
      end_reminder_min: 10,
    },
    location_id: 'area-1',
  };

  // A cross-midnight shift (service day 06-09) ending 05:00 on 06-10.
  const nightRow = {
    user_id: 'user-2',
    status: ScheduleStatus.PRESENT,
    schedule_date: '2026-06-09',
    shift_definition_id: 'shift-night',
    shift_definition: {
      name: 'Malam',
      end_time: '05:00:00',
      crosses_midnight: true,
      end_reminder_min: 10,
    },
    location_id: 'area-2',
  };

  const build = async (byDate: Record<string, unknown[]>) => {
    findByDate = jest.fn((d: string) => Promise.resolve(byDate[d] ?? []));
    sendToUser = jest.fn().mockResolvedValue(undefined);
    redisSet = jest.fn().mockResolvedValue('OK');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftEndReminderCron,
        { provide: SchedulesService, useValue: { findByDate } },
        { provide: NotificationsService, useValue: { sendToUser } },
        { provide: RedisService, useValue: { getClient: () => ({ set: redisSet }) } },
      ],
    }).compile();
    cron = module.get(ShiftEndReminderCron);
  };

  afterEach(() => jest.clearAllMocks());

  it('reminds a same-day shift ending within its lead time', async () => {
    await build({ '2026-06-10': [dayRow], '2026-06-09': [] });
    // 14:52 Jakarta == 07:52 UTC same day; delta to 15:00 == 8 min ∈ (−5, 10].
    const count = await cron.sendDueReminders(new Date('2026-06-10T07:52:00.000Z'));
    expect(count).toBe(1);
    expect(sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: NotificationType.SHIFT_END_REMINDER,
        data: { shift_definition_id: 'shift-day', location_id: 'area-1' },
      }),
    );
    expect(redisSet).toHaveBeenCalledWith(
      'shift-end-reminder:2026-06-10:user-1:shift-day',
      '1',
      'EX',
      86400,
      'NX',
    );
  });

  it("reminds a cross-midnight shift from yesterday's roster whose end spills into today", async () => {
    await build({ '2026-06-10': [], '2026-06-09': [nightRow] });
    // 04:52 Jakarta == 21:52 UTC prev day; delta to 05:00 == 8 min.
    const count = await cron.sendDueReminders(new Date('2026-06-09T21:52:00.000Z'));
    expect(count).toBe(1);
    expect(sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-2', type: NotificationType.SHIFT_END_REMINDER }),
    );
  });

  it('does not fire a same-day shift ~24h before its next clock occurrence', async () => {
    // Yesterday's non-crossing shift is filtered out (its end was yesterday), so a
    // 14:52 run today must not resurface it.
    await build({ '2026-06-10': [], '2026-06-09': [{ ...dayRow, schedule_date: '2026-06-09' }] });
    const count = await cron.sendDueReminders(new Date('2026-06-10T07:52:00.000Z'));
    expect(count).toBe(0);
  });

  it('skips shifts with no end reminder configured', async () => {
    await build({
      '2026-06-10': [
        { ...dayRow, shift_definition: { ...dayRow.shift_definition, end_reminder_min: null } },
      ],
      '2026-06-09': [],
    });
    const count = await cron.sendDueReminders(new Date('2026-06-10T07:52:00.000Z'));
    expect(count).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
  });

  it('fails safe (no send) when Redis errors', async () => {
    await build({ '2026-06-10': [dayRow], '2026-06-09': [] });
    redisSet.mockRejectedValue(new Error('redis down'));
    const count = await cron.sendDueReminders(new Date('2026-06-10T07:52:00.000Z'));
    expect(count).toBe(0);
    expect(sendToUser).not.toHaveBeenCalled();
  });
});
