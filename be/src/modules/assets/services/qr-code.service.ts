import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { S3Service } from '../../../shared/services/s3.service';

/**
 * Generates asset QR codes per ADR-026: content is the plain string
 * `SEKAR:{ASSET_CODE}` (no JSON), 300×300 PNG, error-correction level H for
 * outdoor durability. Stored privately in S3 under `qr-codes/`; a presigned
 * URL is minted on read.
 */
@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  constructor(private readonly s3Service: S3Service) {}

  /** QR content for an asset code (also used by the mobile scanner to match). */
  static content(assetCode: string): string {
    return `SEKAR:${assetCode}`;
  }

  private static key(assetCode: string): string {
    return `qr-codes/${assetCode}.png`;
  }

  /**
   * Render + upload the QR for an asset code. Returns the S3 object key
   * (stored on the asset; presign on read for viewing).
   */
  async generate(assetCode: string): Promise<string> {
    const buffer = await QRCode.toBuffer(QrCodeService.content(assetCode), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const key = QrCodeService.key(assetCode);
    await this.s3Service.uploadFile(buffer, key, 'image/png');
    this.logger.log(`Generated QR for ${assetCode} → ${key}`);
    return key;
  }

  /** Presigned, viewable URL for a stored QR key (default 1h). */
  async presignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.s3Service.getPresignedUrl(key, expiresIn);
  }
}
