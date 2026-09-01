import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

// Mock s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

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

    it('should omit credentials (instance-role chain) when no keys and no endpoint', async () => {
      const mockConfigNoCreds = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-3',
            AWS_S3_BUCKET: 'sekar-media-staging',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [S3Service, { provide: ConfigService, useValue: mockConfigNoCreds }],
      }).compile();

      testModule.get<S3Service>(S3Service);

      // The last S3Client invocation must carry NO credentials key so the AWS SDK
      // default provider chain (EC2 instance role) resolves them at call time.
      const calls = (S3Client as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toEqual({ region: 'ap-southeast-3' });
      expect(lastCall).not.toHaveProperty('credentials');

      await testModule.close();
    });

    it('should use dummy credentials when an endpoint is set without keys (LocalStack/MinIO)', async () => {
      const mockConfigEndpointOnly = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media',
            AWS_ENDPOINT_URL: 'http://localhost:9000',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [S3Service, { provide: ConfigService, useValue: mockConfigEndpointOnly }],
      }).compile();

      testModule.get<S3Service>(S3Service);

      const calls = (S3Client as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toMatchObject({
        region: 'ap-southeast-1',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      });

      await testModule.close();
    });

    it('builds a SECOND client on AWS_PUBLIC_ENDPOINT_URL for signing read URLs', async () => {
      (S3Client as jest.Mock).mockClear();
      const cfg = {
        get: jest.fn((key: string): string | undefined => {
          return {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media-dev',
            AWS_ENDPOINT_URL: 'http://localhost:19000',
            AWS_PUBLIC_ENDPOINT_URL: 'http://172.25.165.11:19000',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          }[key];
        }),
      };
      const testModule = await Test.createTestingModule({
        providers: [S3Service, { provide: ConfigService, useValue: cfg }],
      }).compile();
      testModule.get<S3Service>(S3Service);

      const calls = (S3Client as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls).toHaveLength(2); // upload client + presign client
      expect(calls[0].endpoint).toBe('http://localhost:19000'); // uploads: internal
      expect(calls[1].endpoint).toBe('http://172.25.165.11:19000'); // presign: public
      await testModule.close();
    });

    it('does NOT build a second client when no public endpoint is set (real S3 / same-endpoint)', async () => {
      (S3Client as jest.Mock).mockClear();
      const cfg = {
        get: jest.fn((key: string): string | undefined => {
          return { AWS_REGION: 'ap-southeast-3', AWS_S3_BUCKET: 'sekar-media-staging' }[key];
        }),
      };
      const testModule = await Test.createTestingModule({
        providers: [S3Service, { provide: ConfigService, useValue: cfg }],
      }).compile();
      testModule.get<S3Service>(S3Service);

      expect((S3Client as jest.Mock).mock.calls).toHaveLength(1); // one client, reused for presign
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

  describe('getEndpoint', () => {
    it('should return undefined for production AWS configuration', () => {
      expect(service.getEndpoint()).toBeUndefined();
    });

    it('should return endpoint URL for LocalStack configuration', async () => {
      const mockConfigWithEndpoint = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media',
            AWS_ACCESS_KEY_ID: 'test-access-key',
            AWS_SECRET_ACCESS_KEY: 'test-secret-key',
            AWS_ENDPOINT_URL: 'http://localhost:4566',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigWithEndpoint,
          },
        ],
      }).compile();

      const serviceWithEndpoint = testModule.get<S3Service>(S3Service);

      expect(serviceWithEndpoint.getEndpoint()).toBe('http://localhost:4566');

      await testModule.close();
    });
  });

  describe('generateUrl (private method)', () => {
    it('should generate AWS virtual-hosted-style URL when no endpoint configured', async () => {
      const buffer = Buffer.from('test');
      const key = 'test/file.jpg';

      mockS3Send.mockResolvedValue({});

      const url = await service.uploadFile(buffer, key, 'image/jpeg');

      expect(url).toMatch(/^https:\/\/sekar-media\.s3\.ap-southeast-1\.amazonaws\.com\//);
    });

    it('should generate LocalStack path-style URL when endpoint configured', async () => {
      const mockConfigWithEndpoint = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_ENDPOINT_URL: 'http://localhost:4566',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigWithEndpoint,
          },
        ],
      }).compile();

      const serviceWithEndpoint = testModule.get<S3Service>(S3Service);
      mockS3Send.mockResolvedValue({});

      const buffer = Buffer.from('test');
      const key = 'test/file.jpg';
      const url = await serviceWithEndpoint.uploadFile(buffer, key, 'image/jpeg');

      expect(url).toBe('http://localhost:4566/sekar-media/test/file.jpg');

      await testModule.close();
    });

    it('should handle endpoint URL with trailing slash', async () => {
      const mockConfigWithTrailingSlash = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_ENDPOINT_URL: 'http://localhost:4566/',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigWithTrailingSlash,
          },
        ],
      }).compile();

      const serviceWithTrailingSlash = testModule.get<S3Service>(S3Service);
      mockS3Send.mockResolvedValue({});

      const buffer = Buffer.from('test');
      const key = 'test/file.jpg';
      const url = await serviceWithTrailingSlash.uploadFile(buffer, key, 'image/jpeg');

      expect(url).toBe('http://localhost:4566/sekar-media/test/file.jpg');

      await testModule.close();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL with default expiration', async () => {
      const key = 'test/file.jpg';
      const mockPresignedUrl = 'https://presigned-url.example.com';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const result = await service.getPresignedUrl(key);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'sekar-media',
        Key: key,
      });
      expect(result).toBe(mockPresignedUrl);
    });

    it('should generate presigned URL with custom expiration', async () => {
      const key = 'test/file.jpg';
      const expiresIn = 7200;
      const mockPresignedUrl = 'https://presigned-url.example.com';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const result = await service.getPresignedUrl(key, expiresIn);

      expect(result).toBe(mockPresignedUrl);
    });

    it('should throw error if presigned URL generation fails', async () => {
      const key = 'test/file.jpg';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Presigning failed'));

      await expect(service.getPresignedUrl(key)).rejects.toThrow('Presigning failed');
    });
  });

  describe('extractKeyFromUrl', () => {
    it('should return null for empty URL', () => {
      expect(service.extractKeyFromUrl('')).toBeNull();
      expect(service.extractKeyFromUrl(null as any)).toBeNull();
    });

    it('should extract key from s3:// URI', () => {
      const url = 's3://sekar-media/test/file.jpg';
      const result = service.extractKeyFromUrl(url);

      expect(result).toBe('test/file.jpg');
    });

    it('should extract key from LocalStack path-style URL', async () => {
      const mockConfigWithEndpoint = {
        get: jest.fn((key: string) => {
          const config: { [key: string]: string } = {
            AWS_REGION: 'ap-southeast-1',
            AWS_S3_BUCKET: 'sekar-media',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_ENDPOINT_URL: 'http://localhost:4566',
            AWS_S3_FORCE_PATH_STYLE: 'true',
          };
          return config[key];
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigWithEndpoint,
          },
        ],
      }).compile();

      const serviceWithEndpoint = testModule.get<S3Service>(S3Service);

      const url = 'http://localhost:4566/sekar-media/test/file.jpg';
      const result = serviceWithEndpoint.extractKeyFromUrl(url);

      expect(result).toBe('test/file.jpg');

      await testModule.close();
    });

    it('should extract key from AWS virtual-hosted-style URL', () => {
      const url = 'https://sekar-media.s3.ap-southeast-1.amazonaws.com/test/file.jpg';
      const result = service.extractKeyFromUrl(url);

      expect(result).toBe('test/file.jpg');
    });

    it('should extract key from AWS path-style URL', () => {
      const url = 'https://s3.ap-southeast-1.amazonaws.com/sekar-media/test/file.jpg';
      const result = service.extractKeyFromUrl(url);

      expect(result).toBe('test/file.jpg');
    });

    it('should return null for invalid URL', () => {
      const url = 'not-a-valid-url';
      const result = service.extractKeyFromUrl(url);

      expect(result).toBeNull();
    });

    it('should handle URL parsing errors', () => {
      const url = 'http://';
      const result = service.extractKeyFromUrl(url);

      expect(result).toBeNull();
    });
  });

  describe('convertToPresignedUrl', () => {
    it('should convert URL to presigned URL successfully', async () => {
      const url = 's3://sekar-media/test/file.jpg';
      const mockPresignedUrl = 'https://presigned-url.example.com';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const result = await service.convertToPresignedUrl(url);

      expect(result).toBe(mockPresignedUrl);
    });

    it('should return original URL if key extraction fails', async () => {
      const url = 'invalid-url';

      const result = await service.convertToPresignedUrl(url);

      expect(result).toBe(url);
    });

    it('should return original URL if presigned URL generation fails', async () => {
      const url = 's3://sekar-media/test/file.jpg';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Presigning failed'));

      const result = await service.convertToPresignedUrl(url);

      expect(result).toBe(url);
    });

    it('should use custom expiration time', async () => {
      const url = 's3://sekar-media/test/file.jpg';
      const expiresIn = 7200;
      const mockPresignedUrl = 'https://presigned-url.example.com';

      (GetObjectCommand as unknown as jest.Mock).mockImplementation(() => ({}));
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const result = await service.convertToPresignedUrl(url, expiresIn);

      expect(result).toBe(mockPresignedUrl);
    });

    it('should return data: URIs as-is without logging or presigning', async () => {
      const dataUri = `data:image/jpeg;base64,${'A'.repeat(5_000_000)}`;
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await service.convertToPresignedUrl(dataUri);

      expect(result).toBe(dataUri);
      expect(getSignedUrl).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should return blob: URIs as-is without presigning', async () => {
      const blobUri = 'blob:https://sekar.example.com/abc-123';

      const result = await service.convertToPresignedUrl(blobUri);

      expect(result).toBe(blobUri);
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('should truncate the URL in the warn log when key extraction fails', async () => {
      const longUrl = `not-an-s3-url-${'x'.repeat(500)}`;
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await service.convertToPresignedUrl(longUrl);

      expect(result).toBe(longUrl);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logged = warnSpy.mock.calls[0][0] as string;
      expect(logged).toContain('[truncated,');
      expect(logged.length).toBeLessThan(longUrl.length);
    });
  });
});
