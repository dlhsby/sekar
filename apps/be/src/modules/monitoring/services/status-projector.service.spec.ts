import { Test, TestingModule } from '@nestjs/testing';
import { StatusProjectorService } from './status-projector.service';
import { RedisService } from '../../../common/services/redis.service';
import { StatusCalculatorService } from './status-calculator.service';

const mockRedisService = {
  streamCreateGroup: jest.fn().mockResolvedValue(undefined),
  streamReadGroup: jest.fn().mockResolvedValue([]),
  streamAck: jest.fn().mockResolvedValue(undefined),
};

const mockStatusCalculator = {
  onLocationPing: jest.fn().mockResolvedValue(undefined),
};

describe('StatusProjectorService', () => {
  let service: StatusProjectorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusProjectorService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: StatusCalculatorService, useValue: mockStatusCalculator },
      ],
    }).compile();

    service = module.get<StatusProjectorService>(StatusProjectorService);
    await service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should create consumer group on startup', () => {
      expect(mockRedisService.streamCreateGroup).toHaveBeenCalledWith(
        'location:pings',
        'monitoring-projector',
      );
    });
  });

  describe('processPendingMessages', () => {
    it('should do nothing when stream is empty', async () => {
      mockRedisService.streamReadGroup.mockResolvedValueOnce([]);
      await service.processPendingMessages();
      expect(mockStatusCalculator.onLocationPing).not.toHaveBeenCalled();
      expect(mockRedisService.streamAck).not.toHaveBeenCalled();
    });

    it('should process valid ping messages and ACK them', async () => {
      const now = new Date().toISOString();
      mockRedisService.streamReadGroup.mockResolvedValueOnce([
        {
          id: '1-0',
          fields: {
            userId: 'user-1',
            lat: '-7.2504',
            lng: '112.7688',
            accuracy: '5.5',
            battery: '80',
            loggedAt: now,
          },
        },
        {
          id: '2-0',
          fields: {
            userId: 'user-2',
            lat: '-7.2600',
            lng: '112.7700',
            accuracy: 'null',
            battery: 'null',
            loggedAt: now,
          },
        },
      ]);

      await service.processPendingMessages();

      expect(mockStatusCalculator.onLocationPing).toHaveBeenCalledTimes(2);
      expect(mockStatusCalculator.onLocationPing).toHaveBeenNthCalledWith(
        1,
        'user-1',
        -7.2504,
        112.7688,
        5.5,
        80,
        new Date(now),
      );
      expect(mockStatusCalculator.onLocationPing).toHaveBeenNthCalledWith(
        2,
        'user-2',
        -7.26,
        112.77,
        null,
        null,
        new Date(now),
      );
      expect(mockRedisService.streamAck).toHaveBeenCalledWith(
        'location:pings',
        'monitoring-projector',
        '1-0',
        '2-0',
      );
    });

    it('should ACK messages even when processing fails (avoids infinite loop)', async () => {
      const now = new Date().toISOString();
      mockRedisService.streamReadGroup.mockResolvedValueOnce([
        {
          id: '3-0',
          fields: {
            userId: 'user-3',
            lat: '-7.25',
            lng: '112.76',
            accuracy: 'null',
            battery: 'null',
            loggedAt: now,
          },
        },
      ]);
      mockStatusCalculator.onLocationPing.mockRejectedValueOnce(new Error('DB error'));

      await service.processPendingMessages();

      // Should still ACK despite the processing error
      expect(mockRedisService.streamAck).toHaveBeenCalledWith(
        'location:pings',
        'monitoring-projector',
        '3-0',
      );
    });

    it('should not crash when streamReadGroup itself throws', async () => {
      mockRedisService.streamReadGroup.mockRejectedValueOnce(new Error('Redis unavailable'));
      await expect(service.processPendingMessages()).resolves.toBeUndefined();
    });
  });
});
