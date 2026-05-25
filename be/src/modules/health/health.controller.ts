import { Controller, Get, HttpCode, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';

type CheckResult = { status: 'ok' | 'down'; latencyMs?: number; error?: string };
type ReadyResponse = {
  status: 'ok' | 'degraded';
  uptimeSec: number;
  checks: Record<string, CheckResult>;
};

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live(): { status: 'ok'; uptimeSec: number } {
    return {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe — dependencies are reachable',
    description:
      'Checks DB (TypeORM connection) and Redis (PING). Returns 200 with status=ok when all are healthy, 503 with status=degraded otherwise.',
  })
  @ApiResponse({ status: 200, description: 'All dependencies healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies down' })
  async ready(): Promise<ReadyResponse> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const allUp = db.status === 'ok' && redis.status === 'ok';

    const body: ReadyResponse = {
      status: allUp ? 'ok' : 'degraded',
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      checks: { db, redis },
    };

    if (!allUp) {
      this.logger.warn(`Readiness degraded: ${JSON.stringify(body.checks)}`);
      // Return a real 503 so orchestrators (k8s readiness probes, load
      // balancers) pull this instance out of rotation. Passing the `body`
      // object to HttpException preserves the full JSON response shape.
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }

  private async checkDb(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (err) {
      return { status: 'down', error: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      const ok = await this.redis.ping();
      return ok
        ? { status: 'ok', latencyMs: Date.now() - t0 }
        : { status: 'down', error: 'PING did not return PONG' };
    } catch (err) {
      return { status: 'down', error: (err as Error).message };
    }
  }
}
