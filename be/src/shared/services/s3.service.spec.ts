import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe('S3Service', () => {
  let module: TestingModule;
  let service: S3Service;
  let configService: ConfigService;
  let mockS3Send: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: { [key: string]: string } = {
        AWS_REGION: 'ap-southeast-1',
        AWS_S3_BUCKET: 'sekar-media',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);

    // Get the mock send function from S3Client
    mockS3Send = (S3Client as jest.Mock).mock.results[0].value.send;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      expect(configService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(configService.get).toHaveBeenCalledWith('AWS_S3_BUCKET');
      expect(configService.get).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID');
      expect(configService.get).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY');
      expect(S3Client).toHaveBeenCalledWith({
        region: 'ap-southeast-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should use default values when config is not provided', async () => {
      const mockConfigWithDefaults = {
        get: jest.fn(() => undefined),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigWithDefaults,
          },
        ],
      }).compile();

      const serviceWithDefaults = testModule.get<S3Service>(S3Service);

      expect(serviceWithDefaults.getRegion()).toBe('ap-southeast-1');
      expect(serviceWithDefaults.getBucket()).toBe('sekar-media');

      await testModule.close();
    });
  });

  describe('uploadFile', () => {
    it('should upload file to S3 successfully', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'sekar-media/2026/01/09/clock-in/test.jpg';
      const contentType = 'image/jpeg';

      mockS3Send.mockResolvedValue({});

      const result = await service.uploadFile(buffer, key, contentType);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'sekar-media',
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      expect(mockS3Send).toHaveBeenCalled();
      expect(result).toBe(
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/test.jpg',
      );
    });

    it('should throw error if S3 upload fails', async () => {
      const buffer = Buffer.from('test file content');
      const key = 'sekar-media/2026/01/09/clock-in/test.jpg';
      const contentType = 'image/jpeg';

      mockS3Send.mockRejectedValue(new Error('S3 upload failed'));

      await expect(service.uploadFile(buffer, key, contentType)).rejects.toThrow(
        'S3 upload failed',
      );
    });
  });

  describe('generateKey', () => {
    it('should generate key with correct format', () => {
      const folder = 'clock-in';
      const filename = 'test-uuid.jpg';

      // Mock date to get consistent results
      const mockDate = new Date('2026-01-09T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const key = service.generateKey(folder, filename);

      expect(key).toBe('sekar-media/2026/01/09/clock-in/test-uuid.jpg');

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should pad month and day with zero', () => {
      const folder = 'reports';
      const filename = 'report.pdf';

      // Mock date with single-digit month and day
      const mockDate = new Date('2026-03-05T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const key = service.generateKey(folder, filename);

      expect(key).toBe('sekar-media/2026/03/05/reports/report.pdf');

      // Restore Date
      jest.restoreAllMocks();
    });
  });

  describe('getBucket', () => {
    it('should return bucket name', () => {
      expect(service.getBucket()).toBe('sekar-media');
    });
  });

  describe('getRegion', () => {
    it('should return AWS region', () => {
      expect(service.getRegion()).toBe('ap-southeast-1');
    });
  });
});
