import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return application info', () => {
      const result = service.getHello();
      expect(result).toHaveProperty('message', 'SEKAR Backend API');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('status', 'running');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = service.healthCheck();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
    });

    it('should return valid timestamp', () => {
      const result = service.healthCheck() as any;
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return positive uptime', () => {
      const result = service.healthCheck() as any;
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
