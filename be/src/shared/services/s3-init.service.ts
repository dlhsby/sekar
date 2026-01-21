import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

/**
 * S3 Initialization Service
 *
 * Automatically creates S3 bucket on application startup.
 * Only runs in development with LocalStack endpoint configured.
 * Idempotent - safe to run multiple times.
 */
@Injectable()
export class S3InitService implements OnModuleInit {
  private readonly logger = new Logger(S3InitService.name);
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string | undefined;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'sekar-media';
    this.endpoint = this.configService.get<string>('AWS_ENDPOINT_URL');
    const forcePathStyle = this.configService.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

    const s3Config: any = {
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'test',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'test',
      },
    };

    if (this.endpoint) {
      s3Config.endpoint = this.endpoint;
      s3Config.forcePathStyle = forcePathStyle;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    // Only run in development with LocalStack endpoint
    if (nodeEnv === 'development' && this.endpoint) {
      await this.ensureBucketExists();
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      this.logger.log(`Checking if S3 bucket exists: ${this.bucket}`);

      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket already exists: ${this.bucket}`);

    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Creating S3 bucket: ${this.bucket}`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`✓ S3 bucket created successfully: ${this.bucket}`);
        } catch (createError) {
          this.logger.error(`Failed to create S3 bucket: ${createError.message}`);
        }
      } else {
        this.logger.error(`Error checking S3 bucket: ${error.message}`);
      }
    }
  }
}
