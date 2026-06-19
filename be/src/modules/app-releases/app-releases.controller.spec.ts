import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppReleasesController } from './app-releases.controller';
import { AppReleasesService } from './app-releases.service';
import { AppRelease } from './entities/app-release.entity';

describe('AppReleasesController', () => {
  let controller: AppReleasesController;
  let service: jest.Mocked<
    Pick<AppReleasesService, 'getLatestOrThrow' | 'getLatestDownloadUrl' | 'create' | 'toResponse'>
  >;

  const release = { platform: 'android', storage_key: 'k', created_at: new Date() } as AppRelease;
  const req = { protocol: 'http', get: () => 'api.sekar.wahyutrip.com' } as never;

  beforeEach(async () => {
    service = {
      getLatestOrThrow: jest.fn().mockResolvedValue(release),
      getLatestDownloadUrl: jest.fn().mockResolvedValue('https://signed/x'),
      create: jest.fn().mockResolvedValue(release),
      toResponse: jest.fn().mockReturnValue({ version: '0.0.1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppReleasesController],
      providers: [
        { provide: AppReleasesService, useValue: service },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AppReleasesController);
  });

  it('getLatest defaults platform to android and builds the base URL from the request', async () => {
    await controller.getLatest({}, req);
    expect(service.getLatestOrThrow).toHaveBeenCalledWith('android', undefined);
    expect(service.toResponse).toHaveBeenCalledWith(release, 'http://api.sekar.wahyutrip.com');
  });

  it('getLatest honors an explicit platform + channel', async () => {
    await controller.getLatest({ platform: 'ios', channel: 'production' }, req);
    expect(service.getLatestOrThrow).toHaveBeenCalledWith('ios', 'production');
  });

  it('downloadLatest 302-redirects to the presigned URL', async () => {
    const res = { redirect: jest.fn() } as never;
    await controller.downloadLatest({ platform: 'android' }, res);
    expect(service.getLatestDownloadUrl).toHaveBeenCalledWith('android', undefined);
    expect((res as { redirect: jest.Mock }).redirect).toHaveBeenCalledWith(302, 'https://signed/x');
  });

  it('create registers a release and returns the mapped response', async () => {
    const dto = {
      platform: 'android' as const,
      version: '0.0.1',
      buildNumber: 'b',
      storageKey: 'k',
    };
    const out = await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(out).toEqual({ version: '0.0.1' });
  });
});
