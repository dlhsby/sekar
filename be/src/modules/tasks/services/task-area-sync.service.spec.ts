import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAreaSyncService } from './task-area-sync.service';
import { Task, TaskStatus } from '../entities/task.entity';
import { UserAreasService } from '../../user-areas/user-areas.service';

describe('TaskAreaSyncService', () => {
  let service: TaskAreaSyncService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let userAreasService: jest.Mocked<UserAreasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAreaSyncService,
        {
          provide: getRepositoryToken(Task),
          useValue: { find: jest.fn() },
        },
        {
          provide: UserAreasService,
          useValue: { syncTaskBasedAreas: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(TaskAreaSyncService);
    taskRepository = module.get(getRepositoryToken(Task));
    userAreasService = module.get(UserAreasService);
  });

  it('syncs the deduped set of active-task areas for a worker', async () => {
    taskRepository.find.mockResolvedValue([
      { id: 't1', area_id: 'area-1' },
      { id: 't2', area_id: 'area-2' },
      { id: 't3', area_id: 'area-1' }, // duplicate area
      { id: 't4', area_id: null }, // no area → ignored
    ] as Task[]);

    await service.syncForUser('user-1');

    // Only active statuses are queried.
    expect(taskRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assigned_to: 'user-1' }) }),
    );
    expect(userAreasService.syncTaskBasedAreas).toHaveBeenCalledWith('user-1', ['area-1', 'area-2']);
  });

  it('clears task-based areas when the worker has no active tasks', async () => {
    taskRepository.find.mockResolvedValue([]);

    await service.syncForUser('user-1');

    expect(userAreasService.syncTaskBasedAreas).toHaveBeenCalledWith('user-1', []);
  });

  it('is a no-op for a missing user id', async () => {
    await service.syncForUser(undefined);
    await service.syncForUser(null);

    expect(taskRepository.find).not.toHaveBeenCalled();
    expect(userAreasService.syncTaskBasedAreas).not.toHaveBeenCalled();
  });

  it('never throws when the sync fails (task transition must not break)', async () => {
    taskRepository.find.mockRejectedValue(new Error('db down'));

    await expect(service.syncForUser('user-1')).resolves.toBeUndefined();
    expect(userAreasService.syncTaskBasedAreas).not.toHaveBeenCalled();
  });

  it('only counts active statuses (assigned/accepted/in_progress/revision_needed)', async () => {
    taskRepository.find.mockResolvedValue([]);

    await service.syncForUser('user-1');

    const whereArg = taskRepository.find.mock.calls[0][0]?.where as any;
    // TypeORM In(...) wraps the array under _value.
    expect(whereArg.status._value).toEqual([
      TaskStatus.ASSIGNED,
      TaskStatus.ACCEPTED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVISION_NEEDED,
    ]);
  });
});
