import { lastValueFrom, of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { PhotoUrlInterceptor } from './photo-url.interceptor';
import { PhotoStorageService } from '../../shared/services/photo-storage.service';

const PNG = 'data:image/png;base64,AAAA';

function ctxWithBody(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ body }) }),
  } as unknown as ExecutionContext;
}
const handlerOf = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('PhotoUrlInterceptor', () => {
  let interceptor: PhotoUrlInterceptor;
  let photos: jest.Mocked<
    Pick<PhotoStorageService, 'store' | 'storeArray' | 'presign' | 'presignArray'>
  >;

  beforeEach(() => {
    photos = {
      store: jest.fn(async (v: string | null | undefined, _folder: string) =>
        v && v.startsWith('data:') ? 'STORED_URL' : (v ?? null),
      ),
      storeArray: jest.fn(async (vs: string[] | null | undefined, _folder: string) =>
        (vs ?? []).map((v) => (v.startsWith('data:') ? 'STORED_URL' : v)),
      ),
      presign: jest.fn(async (v: string | null | undefined) =>
        v ? `${v}?X-Amz-Signature=s` : (v ?? null),
      ),
      presignArray: jest.fn(async (vs: string[] | null | undefined) =>
        (vs ?? []).map((v) => `${v}?X-Amz-Signature=s`),
      ),
    };
    interceptor = new PhotoUrlInterceptor(photos as unknown as PhotoStorageService);
  });

  describe('write — request body conversion (before the handler)', () => {
    it('converts an inline array field to storage', async () => {
      const body = { completion_photo_urls: [PNG, 'https://kept/a.jpg'], description: 'x' };
      const ctx = ctxWithBody(body);
      await lastValueFrom(await interceptor.intercept(ctx, handlerOf(null)));
      expect(photos.storeArray).toHaveBeenCalledWith([PNG, 'https://kept/a.jpg'], 'tasks');
      expect(body.completion_photo_urls).toEqual(['STORED_URL', 'https://kept/a.jpg']);
    });

    it('converts an inline single field to storage', async () => {
      const body = { profile_picture_url: PNG };
      await lastValueFrom(await interceptor.intercept(ctxWithBody(body), handlerOf(null)));
      expect(body.profile_picture_url).toBe('STORED_URL');
    });

    it('leaves a body with no photo fields alone', async () => {
      const body = { description: 'hello' };
      await lastValueFrom(await interceptor.intercept(ctxWithBody(body), handlerOf(null)));
      expect(photos.store).not.toHaveBeenCalled();
      expect(photos.storeArray).not.toHaveBeenCalled();
    });
  });

  describe('read — response presigning (after the handler)', () => {
    it('presigns photo fields on a plain object', async () => {
      const res = await lastValueFrom(
        await interceptor.intercept(
          ctxWithBody(undefined),
          handlerOf({ id: '1', photo_urls: ['k1', 'k2'], clock_in_photo_url: 'sel' }),
        ),
      );
      expect((res as any).photo_urls).toEqual(['k1?X-Amz-Signature=s', 'k2?X-Amz-Signature=s']);
      expect((res as any).clock_in_photo_url).toBe('sel?X-Amz-Signature=s');
    });

    it('presigns nested photo fields inside a paginated { data: [...] } response', async () => {
      const res = await lastValueFrom(
        await interceptor.intercept(
          ctxWithBody(undefined),
          handlerOf({ data: [{ id: '1', profile_picture_url: 'pp' }], meta: { total: 1 } }),
        ),
      );
      expect((res as any).data[0].profile_picture_url).toBe('pp?X-Amz-Signature=s');
    });

    it('leaves a response with no photo fields untouched', async () => {
      const res = await lastValueFrom(
        await interceptor.intercept(ctxWithBody(undefined), handlerOf({ id: '1', name: 'x' })),
      );
      expect(res).toEqual({ id: '1', name: 'x' });
      expect(photos.presign).not.toHaveBeenCalled();
    });
  });
});
