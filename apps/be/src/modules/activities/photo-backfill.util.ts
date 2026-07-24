/**
 * Pure helpers for the F9 tier-2 Phase B backfill (see
 * `scripts/backfill-activity-photos.ts`) — moving existing inline base64
 * `photo_urls` into object storage. Kept in `src/` (not `scripts/`) so the
 * transform is unit-tested; the script is the thin DB/S3 orchestration around it.
 */

export function isInlineMedia(url: string): boolean {
  return /^\s*(data:|blob:)/i.test(url);
}

/** `data:image/png;base64,…` → `png` (jpeg normalised to jpg); default jpg. */
export function extFromDataUri(url: string): string {
  const m = /^\s*data:image\/([a-z0-9.+-]+);base64,/i.exec(url);
  if (!m) return 'jpg';
  const ext = m[1].toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

/** MIME from a data URI, defaulting to image/jpeg. */
export function mimeFromDataUri(url: string): string {
  const m = /^\s*data:([a-z0-9.+/-]+);base64,/i.exec(url);
  return m ? m[1].toLowerCase() : 'image/jpeg';
}

export function bufferFromDataUri(url: string): Buffer {
  const i = url.indexOf('base64,');
  return Buffer.from(i >= 0 ? url.slice(i + 7) : '', 'base64');
}

export interface RewriteStats {
  photosMoved: number;
  bytesMoved: number;
}

/**
 * Rewrite one row's `photo_urls`: every inline data:/blob: entry is uploaded via
 * `uploadOne` and replaced by the returned URL; non-inline entries pass through
 * unchanged (already a key/URL). Pure except for the injected uploader, so it is
 * unit-testable without a DB or a real bucket.
 */
export async function rewritePhotoUrls(
  urls: string[],
  uploadOne: (buf: Buffer, ext: string, mime: string) => Promise<string>,
  stats: RewriteStats,
): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls) {
    if (!isInlineMedia(url)) {
      out.push(url);
      continue;
    }
    const buf = bufferFromDataUri(url);
    out.push(await uploadOne(buf, extFromDataUri(url), mimeFromDataUri(url)));
    stats.photosMoved += 1;
    stats.bytesMoved += buf.length;
  }
  return out;
}

/**
 * Single-value variant of {@link rewritePhotoUrls} for a `text` column that holds
 * ONE photo (profile picture, clock-in/out selfie, asset photo, before/after).
 * Uploads the inline entry and returns the stored URL; a non-inline value (already
 * a key/URL) or null/empty passes through unchanged.
 */
export async function rewritePhotoUrl(
  url: string | null | undefined,
  uploadOne: (buf: Buffer, ext: string, mime: string) => Promise<string>,
  stats: RewriteStats,
): Promise<string | null> {
  if (!url) return url ?? null;
  if (!isInlineMedia(url)) return url;
  const buf = bufferFromDataUri(url);
  const stored = await uploadOne(buf, extFromDataUri(url), mimeFromDataUri(url));
  stats.photosMoved += 1;
  stats.bytesMoved += buf.length;
  return stored;
}
