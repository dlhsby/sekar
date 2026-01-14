import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3 Service
 *
 * Handles file uploads to AWS S3 bucket.
 * Used for storing worker selfies, work report photos/videos, and other media.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'sekar-media';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucket}`);
  }

  /**
   * Upload file to S3
   *
   * @param buffer File buffer
   * @param key S3 object key (path)
   * @param contentType MIME type
   * @returns S3 URL of uploaded file
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      this.logger.log(`Uploading file to S3: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`File uploaded successfully: ${url}`);

      return url;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate S3 key with folder structure
   *
   * Format: sekar-media/{year}/{month}/{folder}/{filename}
   * Example: sekar-media/2026/01/clock-in/uuid-abc123.jpg
   *
   * @param folder Subfolder (e.g., 'clock-in', 'reports', 'work-photos')
   * @param filename File name
   * @returns S3 key
   */
  generateKey(folder: string, filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `sekar-media/${year}/${month}/${day}/${folder}/${filename}`;
  }

  /**
   * Get S3 bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Get AWS region
   */
  getRegion(): string {
    return this.region;
  }
}
