import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Service } from '../../shared/services/s3.service';
import { AppReleasesService } from './app-releases.service';
import { AppRelease } from './entities/app-release.entity';

describe('AppReleasesService', () => {
  let service: AppReleasesService;
  let repo: jest.Mocked<Repository<AppRelease>>;
  let s3: { getPresignedUrl: jest.Mock };
  let config: { get: jest.Mock };

  const baseRelease: AppRelease = {
    id: 'rel-1',
    platform: 'android',
    channel: 'staging',
    version: '0.0.1',
    build_number: '202606191609',
    version_code: 1,
    storage_key: 'app-releases/android/sekar-0.0.1-202606191609.apk',
    file_size: '54000000',
    notes: 'First UAT build',
    is_published: true,
    created_at: new Date('2026-06-19T16:09:00Z'),
    updated_at: new Date('2026-06-19T16:09:00Z'),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...baseRelease, ...x })),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<AppRelease>>;
    s3 = { getPresignedUrl: jest.fn() };
    config = { get: jest.fn().mockReturnValue('staging') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppReleasesService,
        { provide: getRepositoryToken(AppRelease), useValue: repo },
        { provide: S3Service, useValue: s3 },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AppReleasesService);
  });

  describe('create', () => {
    it('maps the DTO to the entity and saves it (camel→snake, fileSize→string)', async () => {
      await service.create({
        platform: 'android',
        version: '0.0.1',
        buildNumber: '202606191609',
        versionCode: 1,
        storageKey: 'app-releases/android/x.apk',
        fileSize: 54000000,
        notes: 'n',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'android',
          channel: 'staging',
          build_number: '202606191609',
          version_code: 1,
          storage_key: 'app-releases/android/x.apk',
          file_size: '54000000',
          notes: 'n',
          is_published: true,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('defaults the channel from NODE_ENV when not provided', async () => {
      config.get.mockReturnValue('production');
      await service.create({
        platform: 'android',
        version: '1.0.0',
        buildNumber: 'b',
        storageKey: 'k',
      });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ channel: 'production' }));
    });

    it('respects an explicit channel and null optional fields', async () => {
      await service.create({
        platform: 'ios',
        channel: 'staging',
        version: '1.0.0',
        buildNumber: 'b',
        storageKey: 'k',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'staging',
          version_code: null,
          file_size: null,
          notes: null,
        }),
      );
    });
  });

  describe('findLatest / getLatestOrThrow', () => {
    it('queries newest published row for platform+channel', async () => {
      repo.findOne.mockResolvedValue(baseRelease);
      const res = await service.findLatest('android');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { platform: 'android', channel: 'staging', is_published: true },
        order: { created_at: 'DESC' },
      });
      expect(res).toBe(baseRelease);
    });

    it('throws NotFound when nothing is published', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.getLatestOrThrow('android')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLatestDownloadUrl', () => {
    it('presigns the latest artifact key for 1 hour', async () => {
      repo.findOne.mockResolvedValue(baseRelease);
      s3.getPresignedUrl.mockResolvedValue('https://signed.example/x');
      const url = await service.getLatestDownloadUrl('android');
      expect(s3.getPresignedUrl).toHaveBeenCalledWith(baseRelease.storage_key, 3600);
      expect(url).toBe('https://signed.example/x');
    });
  });

  describe('toResponse', () => {
    it('builds the stable download link and converts file_size to a number', () => {
      const res = service.toResponse(baseRelease, 'http://api.sekar.wahyutrip.com/');
      expect(res).toEqual({
        platform: 'android',
        channel: 'staging',
        version: '0.0.1',
        buildNumber: '202606191609',
        versionCode: 1,
        fileSize: 54000000,
        notes: 'First UAT build',
        publishedAt: baseRelease.created_at,
        downloadUrl:
          'http://api.sekar.wahyutrip.com/api/v1/app-releases/latest/download?platform=android',
      });
    });

    it('handles a null file_size', () => {
      const res = service.toResponse({ ...baseRelease, file_size: null }, 'http://x');
      expect(res.fileSize).toBeNull();
    });
  });
});
