import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PhotoStorageService } from '../../shared/services/photo-storage.service';

/**
 * One place that makes photo fields behave everywhere (F9), for every module,
 * without touching each service:
 *
 * - **Request (write):** any known photo field arriving as an inline
 *   `data:`/`blob:` payload is uploaded to object storage and replaced with the
 *   stored URL *before* the handler (and before the ValidationPipe) runs — so
 *   base64 can never be persisted, whatever the client sends. No mobile change
 *   needed to stop the bleeding.
 * - **Response (read):** any known photo field holding a stored (private) URL/key
 *   is turned into a time-limited presigned URL so the browser/app can fetch it.
 *   Legacy inline `data:` values and already-presigned URLs pass through.
 *
 * Field → storage folder mapping keeps objects tidy per source. The response walk
 * is depth-bounded and only ever touches these exact field names, so it can't
 * mangle unrelated data.
 */
@Injectable()
export class PhotoUrlInterceptor implements NestInterceptor {
  constructor(private readonly photos: PhotoStorageService) {}

  /** field name → { array?, folder } */
  private static readonly FIELDS: Record<string, { array: boolean; folder: string }> = {
    photo_urls: { array: true, folder: 'activities' },
    completion_photo_urls: { array: true, folder: 'tasks' },
    profile_picture_url: { array: false, folder: 'profiles' },
    clock_in_photo_url: { array: false, folder: 'clock-in' },
    clock_out_photo_url: { array: false, folder: 'clock-out' },
    photo_before_url: { array: false, folder: 'activities' },
    photo_after_url: { array: false, folder: 'activities' },
    photo_url: { array: false, folder: 'assets' },
  };
  private static readonly MAX_DEPTH = 5;

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    // WRITE: convert inline photos in the request body to storage first.
    if (req?.body && typeof req.body === 'object') {
      await this.convertBody(req.body as Record<string, unknown>);
    }
    // READ: presign photo fields on the way out.
    return next.handle().pipe(switchMap((data) => from(this.presignDeep(data, 0))));
  }

  private async convertBody(body: Record<string, unknown>): Promise<void> {
    for (const [field, cfg] of Object.entries(PhotoUrlInterceptor.FIELDS)) {
      if (!(field in body)) continue;
      const val = body[field];
      if (cfg.array) {
        if (Array.isArray(val))
          body[field] = await this.photos.storeArray(val as string[], cfg.folder);
      } else if (typeof val === 'string') {
        body[field] = await this.photos.store(val, cfg.folder);
      }
    }
  }

  /**
   * Walk the response (object / array / paginated `{ data }`) and presign every
   * known photo field found, up to MAX_DEPTH. Returns the same reference (mutated
   * in place) — the value shape is unchanged, only the photo strings are swapped.
   */
  private async presignDeep(node: unknown, depth: number): Promise<unknown> {
    if (node == null || depth > PhotoUrlInterceptor.MAX_DEPTH) return node;

    if (Array.isArray(node)) {
      await Promise.all(node.map((item) => this.presignDeep(item, depth + 1)));
      return node;
    }
    if (typeof node !== 'object') return node;

    const obj = node as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const cfg = PhotoUrlInterceptor.FIELDS[key];
      if (cfg) {
        if (cfg.array && Array.isArray(val)) {
          obj[key] = await this.photos.presignArray(val as string[]);
        } else if (!cfg.array && typeof val === 'string') {
          obj[key] = await this.photos.presign(val);
        }
      } else if (val && typeof val === 'object') {
        await this.presignDeep(val, depth + 1);
      }
    }
    return node;
  }
}
