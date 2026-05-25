import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { FCM_RETRY_QUEUE } from '../queue.constants';

export interface FcmRetryJob {
  notification_id: string;
  attempt: number;
}

/**
 * FcmRetryProcessor
 *
 * Drains the `fcm-retry` queue. Each job re-invokes the FCM send for the
 * referenced notification. On final failure, BullMQ moves the job to the
 * failed set (preserving the row for ops investigation per the
 * `removeOnFail.age: 24h` policy).
 *
 * Phase 4 M2: skeleton. Stage 3 (4-3) wires `NotificationsService.retrySend()`
 * to actually replay the send. For now we acknowledge the job by reloading
 * the notification and logging — if `retrySend` is not yet present, throw so
 * BullMQ retries with backoff.
 */
@Processor(FCM_RETRY_QUEUE)
export class FcmRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(FcmRetryProcessor.name);

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<FcmRetryJob>): Promise<void> {
    const { notification_id, attempt } = job.data;
    this.logger.log(
      `fcm-retry: processing notification=${notification_id} attempt=${attempt} jobId=${job.id}`,
    );

    // Stage 3 will replace this with `await this.notifications.retrySend(notification_id)`.
    const svc = this.notifications as unknown as {
      retrySend?: (id: string) => Promise<void>;
    };
    if (typeof svc.retrySend === 'function') {
      await svc.retrySend(notification_id);
      return;
    }

    // Skeleton path: no retrySend yet — surface as a failure so BullMQ retries
    // until exhausted, then routes to the failed set for investigation.
    throw new Error(
      `fcm-retry skeleton: NotificationsService.retrySend not implemented (M2 stub) — notification_id=${notification_id}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<FcmRetryJob>, err: Error): void {
    this.logger.warn(
      `fcm-retry: job ${job.id} failed (attempts=${job.attemptsMade}/${job.opts.attempts}): ${err.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<FcmRetryJob>): void {
    this.logger.debug(`fcm-retry: job ${job.id} completed`);
  }
}
