import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

import { User, UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import type { ExportFile } from './exporters/dataset';
import type { ExportJob } from './entities/export-job.entity';

describe('ExportController', () => {
  let controller: ExportController;
  let service: {
    requestExport: jest.Mock;
    listJobsForUser: jest.Mock;
    getJobForUser: jest.Mock;
  };

  const user: User = { id: 'u1', role: UserRole.ADMIN_SYSTEM } as User;

  const makeRes = (): Response => {
    const res = { status: jest.fn(), set: jest.fn() } as unknown as Response;
    return res;
  };

  beforeEach(async () => {
    service = {
      requestExport: jest.fn(),
      listJobsForUser: jest.fn(),
      getJobForUser: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ExportController);
  });

  it('streams a file (200) for a sync export', async () => {
    const file: ExportFile = {
      buffer: Buffer.from('a,b'),
      contentType: 'text/csv',
      extension: 'csv',
    };
    service.requestExport.mockResolvedValue({ kind: 'file', file, filename: 'users-2026.csv' });
    const res = makeRes();

    const result = await controller.export({ entityType: 'users' }, user, res);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Disposition': 'attachment; filename="users-2026.csv"',
      }),
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 202 with the job for an async export', async () => {
    const job = {
      id: 'job-1',
      status: 'processing',
      entity_type: 'users',
      format: 'csv',
      row_count: 9000,
      created_at: new Date(),
      error_message: null,
    } as ExportJob;
    service.requestExport.mockResolvedValue({ kind: 'job', job });
    const res = makeRes();

    const result = await controller.export({ entityType: 'users' }, user, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
    expect(result).toMatchObject({ jobId: 'job-1', status: 'processing' });
  });

  it('lists my jobs', async () => {
    service.listJobsForUser.mockResolvedValue([
      {
        id: 'j1',
        status: 'completed',
        entity_type: 'users',
        format: 'csv',
        row_count: 1,
        created_at: new Date(),
        error_message: null,
      },
    ]);
    const result = await controller.listJobs(user);
    expect(result).toHaveLength(1);
    expect(result[0].jobId).toBe('j1');
  });

  it('returns a job with its download URL', async () => {
    service.getJobForUser.mockResolvedValue({
      job: {
        id: 'j1',
        status: 'completed',
        entity_type: 'users',
        format: 'csv',
        row_count: 1,
        created_at: new Date(),
        error_message: null,
      },
      downloadUrl: 'https://s3/presigned',
    });
    const result = await controller.getJob('j1', user);
    expect(result.downloadUrl).toBe('https://s3/presigned');
  });
});
