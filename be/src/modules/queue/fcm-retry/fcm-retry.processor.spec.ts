import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { FcmRetryJob, FcmRetryProcessor } from './fcm-retry.processor';

describe('FcmRetryProcessor', () => {
  const buildJob = (
    data: FcmRetryJob = { notification_id: 'n-1', attempt: 1 },
    overrides: Partial<Job> = {},
  ): Job<FcmRetryJob> =>
    ({
      id: 'job-1',
      data,
      attemptsMade: 1,
      opts: { attempts: 3 },
      ...overrides,
    }) as unknown as Job<FcmRetryJob>;

  it('throws when retrySend is not implemented (skeleton path)', async () => {
    const mod = await Test.createTestingModule({
      providers: [FcmRetryProcessor, { provide: NotificationsService, useValue: {} }],
    }).compile();

    const processor = mod.get(FcmRetryProcessor);
    await expect(processor.process(buildJob())).rejects.toThrow(/retrySend not implemented/);
  });

  it('delegates to NotificationsService.retrySend when present', async () => {
    const retrySend = jest.fn().mockResolvedValue(undefined);
    const mod = await Test.createTestingModule({
      providers: [FcmRetryProcessor, { provide: NotificationsService, useValue: { retrySend } }],
    }).compile();

    const processor = mod.get(FcmRetryProcessor);
    await processor.process(buildJob({ notification_id: 'n-42', attempt: 2 }));
    expect(retrySend).toHaveBeenCalledWith('n-42');
  });

  it('logs on completed event without throwing', async () => {
    const mod = await Test.createTestingModule({
      providers: [FcmRetryProcessor, { provide: NotificationsService, useValue: {} }],
    }).compile();
    const processor = mod.get(FcmRetryProcessor);
    expect(() => processor.onCompleted(buildJob())).not.toThrow();
  });

  it('logs on failed event with attempt count', async () => {
    const mod = await Test.createTestingModule({
      providers: [FcmRetryProcessor, { provide: NotificationsService, useValue: {} }],
    }).compile();
    const processor = mod.get(FcmRetryProcessor);
    expect(() => processor.onFailed(buildJob(), new Error('FCM transport down'))).not.toThrow();
  });
});
