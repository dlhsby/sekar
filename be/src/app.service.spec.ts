import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let module: TestingModule;
  let service: AppService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

    it('should return development environment if NODE_ENV is not set', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = service.healthCheck() as any;
      expect(result.environment).toBe('development');

      process.env.NODE_ENV = originalEnv;
    });

    it('should return correct environment from NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = service.healthCheck() as any;
      expect(result.environment).toBe('production');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
