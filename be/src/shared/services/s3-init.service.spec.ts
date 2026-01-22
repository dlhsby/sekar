import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3InitService } from './s3-init.service';

// Mock AWS SDK S3 Client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  HeadBucketCommand: jest.fn().mockImplementation((params) => ({
    ...params,
    _type: 'HeadBucketCommand',
  })),
  CreateBucketCommand: jest.fn().mockImplementation((params) => ({
    ...params,
    _type: 'CreateBucketCommand',
  })),
}));

describe('S3InitService', () => {
  let module: TestingModule;
  let service: S3InitService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const setupConfigMock = (overrides: Record<string, string | undefined> = {}) => {
    const defaults: Record<string, string | undefined> = {
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_BUCKET: 'sekar-media-dev',
      AWS_ENDPOINT_URL: 'http://localhost:4566',
      AWS_S3_FORCE_PATH_STYLE: 'true',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      NODE_ENV: 'development',
      ...overrides,
    };

    mockConfigService.get.mockImplementation((key: string) => defaults[key]);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setupConfigMock();

    module = await Test.createTestingModule({
      providers: [
        S3InitService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3InitService>(S3InitService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with LocalStack endpoint', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_S3_BUCKET');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_ENDPOINT_URL');
    });

    it('should use default values when config is not set', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_REGION') return undefined;
        if (key === 'AWS_S3_BUCKET') return undefined;
        return undefined;
      });

      const testModule = await Test.createTestingModule({
        providers: [
          S3InitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const testService = testModule.get<S3InitService>(S3InitService);
      expect(testService).toBeDefined();

      await testModule.close();
    });
  });

  describe('onModuleInit', () => {
    it('should create bucket in development with LocalStack endpoint', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // Bucket doesn't exist - throw 404
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);
      mockSend.mockResolvedValueOnce({}); // CreateBucketCommand succeeds

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should skip bucket creation in production', async () => {
      setupConfigMock({ NODE_ENV: 'production', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // Recreate service with production config
      const prodModule = await Test.createTestingModule({
        providers: [
          S3InitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const prodService = prodModule.get<S3InitService>(S3InitService);

      mockSend.mockClear();
      await prodService.onModuleInit();

      expect(mockSend).not.toHaveBeenCalled();

      await prodModule.close();
    });

    it('should skip bucket creation when no LocalStack endpoint', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: undefined });

      // Recreate service without endpoint
      const noEndpointModule = await Test.createTestingModule({
        providers: [
          S3InitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const noEndpointService = noEndpointModule.get<S3InitService>(S3InitService);

      mockSend.mockClear();
      await noEndpointService.onModuleInit();

      expect(mockSend).not.toHaveBeenCalled();

      await noEndpointModule.close();
    });

    it('should not create bucket if it already exists', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // HeadBucketCommand succeeds - bucket exists
      mockSend.mockResolvedValueOnce({});

      await service.onModuleInit();

      // Only HeadBucketCommand should be called
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create bucket when it does not exist (404 status)', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // HeadBucketCommand returns 404
      const notFoundError = new Error('Not Found');
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValueOnce(notFoundError);
      mockSend.mockResolvedValueOnce({}); // CreateBucketCommand

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle bucket creation failure gracefully', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // HeadBucketCommand returns 404
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);

      // CreateBucketCommand fails
      const createError = new Error('Access Denied');
      mockSend.mockRejectedValueOnce(createError);

      // Should not throw, just log error
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should handle unexpected errors gracefully', async () => {
      setupConfigMock({ NODE_ENV: 'development', AWS_ENDPOINT_URL: 'http://localhost:4566' });

      // HeadBucketCommand throws unexpected error
      const unexpectedError = new Error('Network Error');
      (unexpectedError as any).name = 'NetworkError';
      mockSend.mockRejectedValueOnce(unexpectedError);

      // Should not throw, just log error
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });
});
