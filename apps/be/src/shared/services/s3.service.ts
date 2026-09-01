import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Truncate a URL/string for safe logging.
 *
 * Guards against multi-MB `data:` URIs (base64 inline images) or otherwise huge
 * values being written verbatim into logs. Keeps the head (enough to identify the
 * value) and appends an elision marker with the original length.
 */
const LOG_URL_MAX_LEN = 120;
function truncateForLog(value: string | null | undefined): string {
  if (!value) return String(value);
  if (value.length <= LOG_URL_MAX_LEN) return value;
  return `${value.slice(0, LOG_URL_MAX_LEN)}… [truncated, ${value.length} chars]`;
}

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
  /**
   * Client used ONLY to sign read URLs. Same object as `s3Client` unless
   * `AWS_PUBLIC_ENDPOINT_URL` is set — then it points at the public endpoint so
   * the presigned URL's host (which SigV4 signs) is one the browser/device can
   * actually reach. Solves the MinIO split-horizon in dev: the backend uploads
   * via the internal endpoint (`localhost:19000`) while phones/emulators fetch
   * via a reachable host (e.g. the LAN IP). Unset on staging → real S3 (public).
   */
  private presignClient: S3Client;
  private bucket: string;
  private region: string;
  private endpoint: string | undefined;
  private publicEndpoint: string | undefined;
  private forcePathStyle: boolean;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'sekar-media';
    this.endpoint = this.configService.get<string>('AWS_ENDPOINT_URL');
    this.publicEndpoint = this.configService.get<string>('AWS_PUBLIC_ENDPOINT_URL');
    this.forcePathStyle = this.configService.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

    const s3Config: any = { region: this.region };

    // Credential resolution:
    //  - Explicit keys present (dev/MinIO or any deploy that supplies them) → use them.
    //  - No keys but a custom endpoint (LocalStack/MinIO) → keep the dummy creds so the
    //    SDK has something to sign with against the local stack.
    //  - No keys and no endpoint (real AWS) → omit `credentials` entirely so the SDK
    //    default provider chain resolves the EC2/ECS instance role (IMDSv2). No long-lived
    //    access keys live on the host.
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    if (accessKeyId && secretAccessKey) {
      s3Config.credentials = { accessKeyId, secretAccessKey };
    } else if (this.endpoint) {
      s3Config.credentials = { accessKeyId: 'test', secretAccessKey: 'test' };
    } else {
      this.logger.log('S3 Service using the default AWS credential provider chain (instance role)');
    }

    // Add endpoint URL for LocalStack (development)
    if (this.endpoint) {
      s3Config.endpoint = this.endpoint;
      s3Config.forcePathStyle = this.forcePathStyle;
      this.logger.log(`S3 Service using custom endpoint: ${this.endpoint}`);
    }

    this.s3Client = new S3Client(s3Config);

    // A read-URL signer pointed at the PUBLIC endpoint, when one is configured
    // and differs from the internal endpoint. The presigned URL then carries the
    // public host in its SigV4 signature, so it validates when the client fetches
    // it from that host. Reuses the same region/creds/path-style as the upload
    // client. No public endpoint (or same as internal) → reuse s3Client as-is.
    if (this.publicEndpoint && this.publicEndpoint !== this.endpoint) {
      this.presignClient = new S3Client({ ...s3Config, endpoint: this.publicEndpoint });
      this.logger.log(
        `S3 Service presigning read URLs via public endpoint: ${this.publicEndpoint}`,
      );
    } else {
      this.presignClient = this.s3Client;
    }

    this.logger.log(`S3 Service initialized for bucket: ${this.bucket}`);
  }

  /**
   * Generate S3 URL based on configuration
   *
   * @param key - S3 object key
   * @returns Full URL to access the object
   *
   * LocalStack (path-style): http://localhost:4566/bucket-name/key
   * AWS (virtual-hosted): https://bucket.s3.region.amazonaws.com/key
   */
  private generateUrl(key: string): string {
    if (this.endpoint) {
      // LocalStack uses path-style URLs
      const cleanEndpoint = this.endpoint.replace(/\/$/, '');
      return `${cleanEndpoint}/${this.bucket}/${key}`;
    } else {
      // AWS uses virtual-hosted-style URLs
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Upload file to S3
   *
   * @param buffer File buffer
   * @param key S3 object key (path)
   * @param contentType MIME type
   * @returns S3 URL of uploaded file
   */
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    try {
      this.logger.log(`Uploading file to S3: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = this.generateUrl(key);
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

  /**
   * Get S3 endpoint URL (for LocalStack)
   */
  getEndpoint(): string | undefined {
    return this.endpoint;
  }

  /**
   * Generate presigned URL for private S3 object
   *
   * @param key S3 object key
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL valid for the specified duration
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // Sign with the public-endpoint client so the URL host is reachable by the
      // browser/device (see `presignClient`). Falls back to the upload client.
      const url = await getSignedUrl(this.presignClient, command, { expiresIn });
      this.logger.log(`Generated presigned URL for ${key}, expires in ${expiresIn}s`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract S3 key from URL
   * Supports both LocalStack and AWS URL formats
   *
   * @param url Full S3 URL (HTTP or s3://)
   * @returns S3 object key
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    // Handle s3:// URIs
    if (url.startsWith('s3://')) {
      const parts = url.replace('s3://', '').split('/');
      parts.shift(); // Remove bucket name
      return parts.join('/');
    }

    // Handle HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);

        // LocalStack path-style: http://localhost:4566/bucket-name/key
        if (this.endpoint && url.startsWith(this.endpoint)) {
          const path = urlObj.pathname;
          const parts = path.split('/').filter((p) => p);
          parts.shift(); // Remove bucket name
          return parts.join('/');
        }

        // AWS virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
        // OR path-style: https://s3.region.amazonaws.com/bucket/key
        const path = urlObj.pathname;
        const parts = path.split('/').filter((p) => p);

        // If hostname starts with bucket name (virtual-hosted)
        if (urlObj.hostname.startsWith(this.bucket)) {
          return parts.join('/');
        }

        // If path-style (bucket is first path segment)
        if (parts[0] === this.bucket) {
          parts.shift();
          return parts.join('/');
        }

        return parts.join('/');
      } catch (_error) {
        this.logger.error(`Failed to parse URL: ${url}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Convert existing URL to presigned URL
   *
   * @param url Existing S3 URL (can be s3://, http://, or https://)
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL or original URL if extraction fails
   */
  async convertToPresignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    // `data:`/`blob:` URIs are inline content, not S3 objects. Return them as-is
    // WITHOUT attempting extraction/logging — a base64 data URI can be many MB and
    // logging it verbatim floods the logs (and burns CPU) for no benefit.
    if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
      return url;
    }

    const key = this.extractKeyFromUrl(url);

    if (!key) {
      this.logger.warn(
        `Could not extract key from URL: ${truncateForLog(url)}, returning original URL`,
      );
      return url;
    }

    try {
      return await this.getPresignedUrl(key, expiresIn);
    } catch (_error) {
      this.logger.error(
        `Failed to generate presigned URL for ${truncateForLog(url)}, returning original URL`,
      );
      return url;
    }
  }

  /**
   * Delete file from S3
   *
   * @param key S3 object key to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from S3: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`, error.stack);
      throw error;
    }
  }
}
