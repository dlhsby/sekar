import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface StreamMessage {
  id: string;
  fields: Record<string, string>;
}

/**
 * RedisService
 *
 * Manages two ioredis connections (client + subscriber) for:
 * - Redis Streams (location:pings pipeline)
 * - Socket.IO Redis adapter pub/sub
 *
 * Both connections use lazy-connect so the app starts even when
 * Redis is not yet available (graceful degradation).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    // Dev default uses the docker-compose host port (16379) — see
    // infra/docker-compose.yml. Prod overrides via the `REDIS_URL` secret.
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:16379');
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
    this.subscriber = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });

    this.client.connect().catch((e) => this.logger.warn(`Redis client connect failed: ${e.message}`));
    this.subscriber.connect().catch((e) =>
      this.logger.warn(`Redis subscriber connect failed: ${e.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => null);
    await this.subscriber.quit().catch(() => null);
  }

  /** Raw ioredis client for general commands and stream operations. */
  getClient(): Redis {
    return this.client;
  }

  /** Dedicated subscriber connection for Socket.IO Redis adapter. */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /** Health check — returns true when Redis responds to PING. */
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Append a message to a Redis Stream with MAXLEN trimming.
   *
   * @param stream  Stream key (e.g. "location:pings")
   * @param fields  Key-value pairs to store in the message
   * @param maxLen  Approximate max stream length (default 100 000)
   * @returns       The auto-generated message ID
   */
  async streamAdd(
    stream: string,
    fields: Record<string, string>,
    maxLen = 100_000,
  ): Promise<string> {
    return this.client.xadd(
      stream,
      'MAXLEN',
      '~',
      maxLen,
      '*',
      ...Object.entries(fields).flat(),
    ) as Promise<string>;
  }

  /**
   * Create a consumer group on a stream.
   * Silently ignores BUSYGROUP errors (group already exists).
   * Uses MKSTREAM so the stream is created if it doesn't exist yet.
   */
  async streamCreateGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message?.includes('BUSYGROUP')) throw e;
    }
  }

  /**
   * Read new messages from a consumer group.
   *
   * @param stream    Stream key
   * @param group     Consumer group name
   * @param consumer  Consumer name within the group
   * @param count     Max messages to read per call (default 100)
   * @param blockMs   How long to block waiting for messages; 0 = non-blocking
   * @returns         Array of parsed stream messages
   */
  async streamReadGroup(
    stream: string,
    group: string,
    consumer: string,
    count = 100,
    blockMs = 0,
  ): Promise<StreamMessage[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xreadgroupFn = this.client.xreadgroup.bind(this.client) as (...args: any[]) => Promise<any>;
    const result = (await xreadgroupFn(
      'GROUP',
      group,
      consumer,
      'COUNT',
      count,
      ...(blockMs > 0 ? ['BLOCK', blockMs] : []),
      'STREAMS',
      stream,
      '>',
    )) as Array<[string, Array<[string, string[]]>]> | null;

    if (!result) return [];

    const [, messages] = result[0];
    return messages.map(([id, raw]) => {
      const fields: Record<string, string> = {};
      for (let i = 0; i < raw.length; i += 2) {
        fields[raw[i]] = raw[i + 1];
      }
      return { id, fields };
    });
  }

  /**
   * Acknowledge processed messages so they are removed from the PEL.
   *
   * @param stream  Stream key
   * @param group   Consumer group name
   * @param ids     One or more message IDs to acknowledge
   */
  async streamAck(stream: string, group: string, ...ids: string[]): Promise<void> {
    if (ids.length > 0) {
      await this.client.xack(stream, group, ...ids);
    }
  }
}
