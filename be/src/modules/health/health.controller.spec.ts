import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';
import { HealthController } from './health.controller';

type ReadyBody = {
  status: 'ok' | 'degraded';
  checks: Record<string, { status: string; error?: string }>;
};

describe('HealthController', () => {
  let controller: HealthController;
  let dsQuery: jest.Mock;
  let redisPing: jest.Mock;

  const build = async () => {
    dsQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    redisPing = jest.fn().mockResolvedValue(true);

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getDataSourceToken(), useValue: { query: dsQuery } as Partial<DataSource> },
        { provide: RedisService, useValue: { ping: redisPing } },
      ],
    }).compile();

    controller = mod.get(HealthController);
  };

  beforeEach(build);

  describe('live', () => {
    it('returns ok with uptime', () => {
      const res = controller.live();
      expect(res.status).toBe('ok');
      expect(res.uptimeSec).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ready', () => {
    it('returns ok when DB + Redis are healthy', async () => {
      const res = await controller.ready();
      expect(res.status).toBe('ok');
      expect(res.checks.db.status).toBe('ok');
      expect(res.checks.redis.status).toBe('ok');
      expect(dsQuery).toHaveBeenCalledWith('SELECT 1');
      expect(redisPing).toHaveBeenCalled();
    });

    const expectDegraded503 = async (): Promise<ReadyBody> => {
      try {
        await controller.ready();
        throw new Error('expected ready() to throw 503');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        return (err as HttpException).getResponse() as ReadyBody;
      }
    };

    it('throws 503 with degraded body when DataSource throws', async () => {
      dsQuery.mockRejectedValueOnce(new Error('conn refused'));
      const body = await expectDegraded503();
      expect(body.status).toBe('degraded');
      expect(body.checks.db.status).toBe('down');
      expect(body.checks.db.error).toMatch(/conn refused/);
    });

    it('throws 503 with degraded body when ping returns false', async () => {
      redisPing.mockResolvedValueOnce(false);
      const body = await expectDegraded503();
      expect(body.status).toBe('degraded');
      expect(body.checks.redis.status).toBe('down');
      expect(body.checks.redis.error).toMatch(/PING/);
    });

    it('throws 503 with degraded body when ping throws', async () => {
      redisPing.mockRejectedValueOnce(new Error('timeout'));
      const body = await expectDegraded503();
      expect(body.status).toBe('degraded');
      expect(body.checks.redis.status).toBe('down');
      expect(body.checks.redis.error).toMatch(/timeout/);
    });

    it('records latency for healthy checks', async () => {
      const res = await controller.ready();
      expect(res.checks.db.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.checks.redis.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
