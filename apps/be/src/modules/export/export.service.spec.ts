import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { S3Service } from '../../shared/services/s3.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Overtime } from '../overtime/entities/overtime.entity';
import { ExportJob } from './entities/export-job.entity';
import { ExportService, SYNC_ROW_LIMIT } from './export.service';

type QbMock = {
  andWhere: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  getCount: jest.Mock;
  getMany: jest.Mock;
};

function makeQb(count: number, rows: unknown[]): QbMock {
  const qb: QbMock = {
    andWhere: jest.fn(() => qb),
    where: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    getCount: jest.fn().mockResolvedValue(count),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

const admin: User = { id: 'admin-1', role: UserRole.ADMIN_SYSTEM } as User;
const kepala: User = {
  id: 'kr-1',
  role: UserRole.KEPALA_RAYON,
  rayon_id: 'rayon-9',
} as User;

describe('ExportService', () => {
  let service: ExportService;
  let exportJobRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock };
  let userRepo: { createQueryBuilder: jest.Mock };
  let taskRepo: { createQueryBuilder: jest.Mock };
  let s3: { uploadFile: jest.Mock; getPresignedUrl: jest.Mock };

  const stubRepo = () => ({ createQueryBuilder: jest.fn(() => makeQb(0, [])) });

  beforeEach(async () => {
    exportJobRepo = {
      create: jest.fn((v) => ({ id: 'job-1', retry_count: 0, ...v })),
      save: jest.fn((v) => Promise.resolve({ id: 'job-1', ...v })),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    userRepo = stubRepo();
    taskRepo = stubRepo();
    s3 = {
      uploadFile: jest.fn().mockResolvedValue('https://s3/key'),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3/presigned'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(ExportJob), useValue: exportJobRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Location), useValue: stubRepo() },
        { provide: getRepositoryToken(Rayon), useValue: stubRepo() },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Activity), useValue: stubRepo() },
        { provide: getRepositoryToken(Overtime), useValue: stubRepo() },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get(ExportService);
  });

  describe('requestExport — sync', () => {
    it('streams a CSV file when row count is within the sync limit', async () => {
      userRepo.createQueryBuilder.mockReturnValue(
        makeQb(2, [
          { id: 'u1', username: 'a', full_name: 'A', role: 'satgas', is_active: true },
          { id: 'u2', username: 'b', full_name: 'B', role: 'satgas', is_active: true },
        ]),
      );

      const result = await service.requestExport({ entityType: 'users', format: 'csv' }, admin);

      expect(result.kind).toBe('file');
      if (result.kind === 'file') {
        expect(result.filename).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);
        expect(result.file.buffer.toString()).toContain('username');
        expect(result.file.contentType).toContain('text/csv');
      }
      expect(exportJobRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('requestExport — async', () => {
    it('creates a job and returns 202-shape when over the sync limit', async () => {
      userRepo.createQueryBuilder.mockReturnValue(makeQb(SYNC_ROW_LIMIT + 1, []));
      const spy = jest.spyOn(service, 'processJob').mockResolvedValue();

      const result = await service.requestExport({ entityType: 'users' }, admin);

      expect(result.kind).toBe('job');
      if (result.kind === 'job') {
        expect(result.job.status).toBe('processing');
        expect(result.job.row_count).toBe(SYNC_ROW_LIMIT + 1);
      }
      expect(exportJobRepo.save).toHaveBeenCalled();
      await new Promise((r) => setImmediate(r));
      expect(spy).toHaveBeenCalledWith('job-1');
    });
  });

  describe('format / role validation', () => {
    it('rejects KMZ for non-area entities', async () => {
      await expect(
        service.requestExport({ entityType: 'users', format: 'kmz' }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids kepala_rayon from exporting users', async () => {
      await expect(service.requestExport({ entityType: 'users' }, kepala)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('scopes kepala_rayon task export to their own rayon', async () => {
      const qb = makeQb(1, []);
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.requestExport({ entityType: 'tasks' }, kepala);

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('rayon_id'), {
        rayonId: 'rayon-9',
      });
    });

    it('applies endDate as exclusive (next-day boundary) for inclusive date filter', async () => {
      const qb = makeQb(1, []);
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.requestExport(
        { entityType: 'tasks', startDate: '2025-01-01', endDate: '2025-01-31' },
        admin,
      );

      // Find the andWhere call with endDate — should use next-day exclusive bound
      const endDateCall = qb.andWhere.mock.calls.find((call) => {
        const params = call[1] as Record<string, unknown> | undefined;
        return String(call[0]).includes('created_at') && params?.endDate !== undefined;
      });
      expect(endDateCall).toBeDefined();
      const params = endDateCall?.[1] as Record<string, unknown> | undefined;
      expect(params?.endDate).toBe('2025-02-01');
    });

    it('forbids a kepala_rayon with no rayon assignment', async () => {
      await expect(
        service.requestExport({ entityType: 'tasks' }, { ...kepala, rayon_id: undefined } as User),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('processJob', () => {
    it('uploads to S3 and marks the job completed', async () => {
      exportJobRepo.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'processing',
        entity_type: 'users',
        format: 'csv',
        filters: { entityType: 'users' },
        retry_count: 0,
      });

      await service.processJob('job-1');

      expect(s3.uploadFile).toHaveBeenCalled();
      const saved = exportJobRepo.save.mock.calls[exportJobRepo.save.mock.calls.length - 1][0];
      expect(saved.status).toBe('completed');
      expect(saved.file_url).toMatch(/^exports\/users\//);
    });

    it('marks the job failed when generation throws', async () => {
      exportJobRepo.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'processing',
        entity_type: 'users',
        format: 'csv',
        filters: { entityType: 'users' },
        retry_count: 0,
      });
      s3.uploadFile.mockRejectedValue(new Error('S3 down'));

      await service.processJob('job-1');

      const saved = exportJobRepo.save.mock.calls[exportJobRepo.save.mock.calls.length - 1][0];
      expect(saved.status).toBe('failed');
      expect(saved.error_message).toBe('S3 down');
    });

    it('skips already-completed jobs', async () => {
      exportJobRepo.findOne.mockResolvedValue({ id: 'job-1', status: 'completed' });
      await service.processJob('job-1');
      expect(s3.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('getJobForUser', () => {
    it('throws NotFound when the job is missing', async () => {
      exportJobRepo.findOne.mockResolvedValue(null);
      await expect(service.getJobForUser('x', admin)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids access to another user’s job', async () => {
      exportJobRepo.findOne.mockResolvedValue({ id: 'job-1', user_id: 'someone-else' });
      await expect(service.getJobForUser('job-1', admin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a presigned URL for a completed, owned job', async () => {
      exportJobRepo.findOne.mockResolvedValue({
        id: 'job-1',
        user_id: admin.id,
        status: 'completed',
        file_url: 'exports/users/key.csv',
      });

      const { downloadUrl } = await service.getJobForUser('job-1', admin);

      expect(s3.getPresignedUrl).toHaveBeenCalledWith('exports/users/key.csv', 900);
      expect(downloadUrl).toBe('https://s3/presigned');
    });
  });

  describe('retryStuckJobs', () => {
    it('re-fires a stuck job and increments retry_count', async () => {
      exportJobRepo.find.mockResolvedValue([{ id: 'job-1', status: 'processing', retry_count: 1 }]);
      const spy = jest.spyOn(service, 'processJob').mockResolvedValue();

      await service.retryStuckJobs();

      const saved = exportJobRepo.save.mock.calls[exportJobRepo.save.mock.calls.length - 1][0];
      expect(saved.retry_count).toBe(2);
      await new Promise((r) => setImmediate(r));
      expect(spy).toHaveBeenCalledWith('job-1');
    });

    it('fails a job that exceeded the retry budget', async () => {
      exportJobRepo.find.mockResolvedValue([{ id: 'job-1', status: 'processing', retry_count: 3 }]);
      const spy = jest.spyOn(service, 'processJob').mockResolvedValue();

      await service.retryStuckJobs();

      const saved = exportJobRepo.save.mock.calls[exportJobRepo.save.mock.calls.length - 1][0];
      expect(saved.status).toBe('failed');
      expect(saved.error_message).toBe('Max retries exceeded');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
