import {
  isInlineMedia,
  extFromDataUri,
  mimeFromDataUri,
  bufferFromDataUri,
  rewritePhotoUrls,
  RewriteStats,
} from './photo-backfill.util';

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('photo-backfill.util (F9 Phase B transform)', () => {
  it('detects data: and blob: as inline, plain URLs/keys as not', () => {
    expect(isInlineMedia('data:image/png;base64,AAAA')).toBe(true);
    expect(isInlineMedia('  BLOB:http://x/1')).toBe(true);
    expect(isInlineMedia('sekar-media/2026/07/x.jpg')).toBe(false);
    expect(isInlineMedia('https://bucket.s3/x.jpg')).toBe(false);
  });

  it('derives ext + mime from a data URI (jpeg → jpg)', () => {
    expect(extFromDataUri('data:image/jpeg;base64,AA')).toBe('jpg');
    expect(extFromDataUri('data:image/png;base64,AA')).toBe('png');
    expect(extFromDataUri('data:image/webp;base64,AA')).toBe('webp');
    expect(extFromDataUri('not-a-data-uri')).toBe('jpg');
    expect(mimeFromDataUri('data:image/webp;base64,AA')).toBe('image/webp');
  });

  it('decodes the base64 payload to the original bytes', () => {
    const buf = bufferFromDataUri(PNG_1PX);
    expect(buf.length).toBe(70); // the 1×1 PNG above
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
  });

  it('uploads only the inline entries and preserves the rest, in order', async () => {
    const stats: RewriteStats = { photosMoved: 0, bytesMoved: 0 };
    const uploaded: Array<{ ext: string; mime: string; size: number }> = [];
    const uploadOne = async (buf: Buffer, ext: string, mime: string): Promise<string> => {
      uploaded.push({ ext, mime, size: buf.length });
      return `https://store/${uploaded.length}.${ext}`;
    };

    const result = await rewritePhotoUrls(
      ['https://already/stored.jpg', PNG_1PX, 'sekar-media/keep.png'],
      uploadOne,
      stats,
    );

    expect(result).toEqual([
      'https://already/stored.jpg',
      'https://store/1.png',
      'sekar-media/keep.png',
    ]);
    expect(uploaded).toEqual([{ ext: 'png', mime: 'image/png', size: 70 }]);
    expect(stats).toEqual({ photosMoved: 1, bytesMoved: 70 });
  });

  it('is a no-op for a row with no inline media (idempotent re-run)', async () => {
    const stats: RewriteStats = { photosMoved: 0, bytesMoved: 0 };
    const uploadOne = jest.fn();
    const urls = ['sekar-media/a.jpg', 'https://b/c.png'];

    const result = await rewritePhotoUrls(urls, uploadOne, stats);

    expect(result).toEqual(urls);
    expect(uploadOne).not.toHaveBeenCalled();
    expect(stats).toEqual({ photosMoved: 0, bytesMoved: 0 });
  });
});
