import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let module: TestingModule;
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('root', () => {
    it('should return application info', () => {
      const result = {
        message: 'SEKAR Backend API',
        version: '1.0.0',
        status: 'running',
      };
      jest.spyOn(appService, 'getHello').mockImplementation(() => result);
      expect(appController.getHello()).toBe(result);
    });
  });

  describe('health check', () => {
    it('should return health status', () => {
      const result = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 123.45,
        environment: 'test',
      };
      jest.spyOn(appService, 'healthCheck').mockImplementation(() => result);
      expect(appController.healthCheck()).toBe(result);
    });
  });
});
