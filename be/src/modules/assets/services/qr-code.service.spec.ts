import { Test, TestingModule } from '@nestjs/testing';
import { QrCodeService } from './qr-code.service';
import { S3Service } from '../../../shared/services/s3.service';
import * as QRCode from 'qrcode';

jest.mock('qrcode');

describe('QrCodeService', () => {
  let service: QrCodeService;
  let mockS3Service: any;

  beforeEach(async () => {
    mockS3Service = {
      uploadFile: jest.fn().mockResolvedValue('https://s3.example.com/qr-codes/AK-UTARA-001.png'),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned?token=123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCodeService, { provide: S3Service, useValue: mockS3Service }],
    }).compile();

    service = module.get<QrCodeService>(QrCodeService);
  });

  describe('content', () => {
    it('should format content with SEKAR prefix', () => {
      const result = QrCodeService.content('AK-UTARA-001');
      expect(result).toBe('SEKAR:AK-UTARA-001');
    });
  });

  describe('generate', () => {
    it('should generate QR code with correct options', async () => {
      const buffer = Buffer.from('test');
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(buffer);

      await service.generate('AK-UTARA-001');

      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        'SEKAR:AK-UTARA-001',
        expect.objectContaining({
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
          color: { dark: '#000000', light: '#FFFFFF' },
        }),
      );
    });

    it('should upload to S3 with correct key and content type', async () => {
      const buffer = Buffer.from('test');
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(buffer);

      await service.generate('AK-UTARA-001');

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        buffer,
        'qr-codes/AK-UTARA-001.png',
        'image/png',
      );
    });

    it('should return S3 key', async () => {
      const buffer = Buffer.from('test');
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(buffer);

      const result = await service.generate('AK-UTARA-001');

      expect(result).toBe('qr-codes/AK-UTARA-001.png');
    });
  });

  describe('presignedUrl', () => {
    it('should request presigned URL with default expiration', async () => {
      await service.presignedUrl('qr-codes/AK-UTARA-001.png');

      expect(mockS3Service.getPresignedUrl).toHaveBeenCalledWith('qr-codes/AK-UTARA-001.png', 3600);
    });

    it('should request presigned URL with custom expiration', async () => {
      await service.presignedUrl('qr-codes/AK-UTARA-001.png', 7200);

      expect(mockS3Service.getPresignedUrl).toHaveBeenCalledWith('qr-codes/AK-UTARA-001.png', 7200);
    });

    it('should return presigned URL', async () => {
      const result = await service.presignedUrl('qr-codes/AK-UTARA-001.png');

      expect(result).toBe('https://s3.example.com/presigned?token=123');
    });
  });
});
