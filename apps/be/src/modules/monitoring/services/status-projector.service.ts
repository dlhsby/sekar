import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../../common/services/redis.service';
import { StatusCalculatorService } from './status-calculator.service';

export interface LocationPingPayload {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  battery: number | null;
  /** ISO 8601 string */
  loggedAt: string;
}

const STREAM = 'location:pings';
const GROUP = 'monitoring-projector';
const CONSUMER = 'projector-1';

/**
 * StatusProjectorService
 *
 * Reads location pings from the Redis Stream `location:pings` and
 * drives status transitions via StatusCalculatorService asynchronously.
 *
 * This decouples the HTTP response time from the 6+ DB queries that
 * status calculation requires, enabling the system to handle 500+
 * concurrent workers without degrading API latency.
 *
 * Processing model:
 * - @Cron every second polls for up to 100 pending messages
 * - Each message is processed in sequence (avoids per-user race conditions)
 * - Messages are ACKed even on processing errors to prevent infinite redelivery
 */
@Injectable()
export class StatusProjectorService implements OnModuleInit {
  private readonly logger = new Logger(StatusProjectorService.name);
  private projectorRunning = false;

  constructor(
    private readonly redis: RedisService,
    private readonly statusCalculator: StatusCalculatorService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.streamCreateGroup(STREAM, GROUP);
      this.logger.log(`StatusProjector ready (stream=${STREAM}, group=${GROUP})`);
    } catch (e: any) {
      this.logger.warn(
        `StatusProjector: could not create consumer group — Redis unavailable? ${e.message}`,
      );
    }
  }

  /**
   * Poll the Redis Stream every second and process pending location pings.
   * ACKs all messages — including those that fail processing — to avoid
   * infinite redelivery loops (dead-letter handling is deferred to Phase 4).
   */
  @Cron(CronExpression.EVERY_SECOND)
  async processPendingMessages(): Promise<void> {
    if (this.projectorRunning) return;
    this.projectorRunning = true;
    try {
      const messages = await this.redis.streamReadGroup(STREAM, GROUP, CONSUMER, 100);
      if (messages.length === 0) return;

      const ids: string[] = [];

      for (const msg of messages) {
        try {
          const payload = this.parsePayload(msg.fields);
          await this.statusCalculator.onLocationPing(
            payload.userId,
            payload.lat,
            payload.lng,
            payload.accuracy,
            payload.battery,
            new Date(payload.loggedAt),
          );
        } catch (e: any) {
          this.logger.warn(`Failed to process ping ${msg.id}: ${e.message}`);
          // ACK anyway — dead-letter strategy deferred to Phase 4
        } finally {
          ids.push(msg.id);
        }
      }

      await this.redis.streamAck(STREAM, GROUP, ...ids);
    } catch (e: any) {
      this.logger.warn(`StatusProjector tick failed: ${e.message}`);
    } finally {
      this.projectorRunning = false;
    }
  }

  private parsePayload(fields: Record<string, string>): LocationPingPayload {
    return {
      userId: fields['userId'],
      lat: parseFloat(fields['lat']),
      lng: parseFloat(fields['lng']),
      accuracy: fields['accuracy'] !== 'null' ? parseFloat(fields['accuracy']) : null,
      battery: fields['battery'] !== 'null' ? parseFloat(fields['battery']) : null,
      loggedAt: fields['loggedAt'],
    };
  }
}
