import { PhotoStorageService } from './photo-storage.service';
import { S3Service } from './s3.service';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('PhotoStorageService', () => {
  let svc: PhotoStorageService;
  let s3: jest.Mocked<Pick<S3Service, 'generateKey' | 'uploadFile' | 'convertToPresignedUrl'>>;

  beforeEach(() => {
    s3 = {
      generateKey: jest.fn((folder: string, name: string) => `sekar-media/${folder}/${name}`),
      uploadFile: jest.fn((_b: Buffer, key: string, _ct: string) =>
        Promise.resolve(`http://minio/${key}`),
      ),
      convertToPresignedUrl: jest.fn((url: string) =>
        Promise.resolve(`${url}?X-Amz-Signature=abc`),
      ),
    };
    svc = new PhotoStorageService(s3 as unknown as S3Service);
  });

  describe('store (write)', () => {
    it('uploads an inline value and returns the stored URL', async () => {
      const out = await svc.store(PNG, 'tasks');
      expect(out).toMatch(/^http:\/\/minio\/sekar-media\/tasks\/.*\.png$/);
      expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('passes through a non-inline value and null/empty untouched', async () => {
      expect(await svc.store('sekar-media/x.jpg', 'tasks')).toBe('sekar-media/x.jpg');
      expect(await svc.store(null, 'tasks')).toBeNull();
      expect(await svc.store('', 'tasks')).toBe('');
      expect(s3.uploadFile).not.toHaveBeenCalled();
    });

    it('storeArray uploads only the inline entries', async () => {
      const out = await svc.storeArray(['https://kept/a.jpg', PNG], 'overtime');
      expect(out[0]).toBe('https://kept/a.jpg');
      expect(out[1]).toMatch(/^http:\/\/minio\//);
      expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('presign (read)', () => {
    it('presigns a stored URL', async () => {
      expect(await svc.presign('http://minio/sekar-media/x.jpg')).toContain('X-Amz-Signature');
    });

    it('does NOT re-sign an already-presigned URL', async () => {
      const already = 'http://minio/x.jpg?X-Amz-Signature=zzz';
      expect(await svc.presign(already)).toBe(already);
      expect(s3.convertToPresignedUrl).not.toHaveBeenCalled();
    });

    it('passes empty/null through', async () => {
      expect(await svc.presign(null)).toBeNull();
      expect(await svc.presign('')).toBe('');
    });

    it('falls back to the original value when presigning throws', async () => {
      s3.convertToPresignedUrl.mockRejectedValueOnce(new Error('boom'));
      expect(await svc.presign('http://minio/x.jpg')).toBe('http://minio/x.jpg');
    });
  });
});
