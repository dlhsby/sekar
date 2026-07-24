import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { S3Service } from './s3.service';
import {
  isInlineMedia,
  extFromDataUri,
  mimeFromDataUri,
  bufferFromDataUri,
} from '../../modules/activities/photo-backfill.util';

/**
 * One place for the two things every photo field needs (F9):
 *
 * - **On WRITE** (`store`/`storeArray`): if a value arrives as an inline
 *   `data:`/`blob:` payload, upload it to object storage and return the stored
 *   URL — so base64 never lands in a `text`/`text[]` column again. A value that
 *   is already a key/URL passes through untouched. This stops the bleeding
 *   *without a client change*: the app can keep sending base64, the backend just
 *   never persists it.
 * - **On READ** (`presign`/`presignArray`): turn a stored (private) URL/key into
 *   a time-limited presigned URL so the browser/app can actually fetch it. A
 *   legacy inline `data:` value (pre-backfill) passes through so it still renders.
 *
 * Storage is env-agnostic via `S3Service` (MinIO local/prod, S3 staging).
 */
@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);
  /** Presigned-URL lifetime — long enough for app caching, per the activities read path. */
  private static readonly READ_TTL = 86400;

  constructor(private readonly s3: S3Service) {}

  /** Upload one inline value to `folder`; pass through keys/URLs and empty values. */
  async store(value: string | null | undefined, folder: string): Promise<string | null> {
    if (!value) return value ?? null;
    if (!isInlineMedia(value)) return value;
    const buf = bufferFromDataUri(value);
    const key = this.s3.generateKey(folder, `${randomUUID()}.${extFromDataUri(value)}`);
    return this.s3.uploadFile(buf, key, mimeFromDataUri(value));
  }

  /** Upload each inline entry of an array to `folder`; non-inline entries untouched. */
  async storeArray(values: string[] | null | undefined, folder: string): Promise<string[]> {
    if (!values || values.length === 0) return values ?? [];
    return Promise.all(values.map((v) => this.store(v, folder) as Promise<string>));
  }

  /** Presign one stored URL/key for reading; inline `data:` and empty pass through. */
  async presign(value: string | null | undefined): Promise<string | null> {
    if (!value) return value ?? null;
    // Already a presigned URL (has the SigV4 query) — don't re-sign.
    if (value.includes('X-Amz-Signature') || value.includes('X-Amz-Credential')) return value;
    try {
      return await this.s3.convertToPresignedUrl(value, PhotoStorageService.READ_TTL);
    } catch (err) {
      this.logger.warn(`presign failed, returning original: ${(err as Error).message}`);
      return value;
    }
  }

  /** Presign each stored entry of an array for reading. */
  async presignArray(values: string[] | null | undefined): Promise<string[]> {
    if (!values || values.length === 0) return values ?? [];
    return Promise.all(values.map((v) => this.presign(v) as Promise<string>));
  }
}
