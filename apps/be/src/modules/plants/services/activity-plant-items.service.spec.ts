import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPlantItemsService } from './activity-plant-items.service';
import { ActivityPlantItem } from '../entities/activity-plant-item.entity';

describe('ActivityPlantItemsService', () => {
  let service: ActivityPlantItemsService;
  let repository: jest.Mocked<Repository<ActivityPlantItem>>;

  const mockActivityPlantItem: ActivityPlantItem = {
    id: 'item-1',
    activityId: 'activity-1',
    speciesId: 'species-1',
    count: 5,
    notes: 'Test notes',
    created_at: new Date(),
  } as unknown as ActivityPlantItem;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityPlantItemsService,
        {
          provide: getRepositoryToken(ActivityPlantItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ActivityPlantItemsService>(ActivityPlantItemsService);
    repository = module.get<jest.Mocked<Repository<ActivityPlantItem>>>(
      getRepositoryToken(ActivityPlantItem),
    );
  });

  describe('createBatch', () => {
    it('should create multiple plant items in batch', async () => {
      const items = [
        { speciesId: 'species-1', count: 5, notes: 'Item 1' },
        { speciesId: 'species-2', count: 10, notes: 'Item 2' },
      ];

      const created = [
        {
          ...mockActivityPlantItem,
          id: 'item-1',
          speciesId: 'species-1',
          count: 5,
        },
        {
          ...mockActivityPlantItem,
          id: 'item-2',
          speciesId: 'species-2',
          count: 10,
        },
      ];

      repository.create.mockImplementation((item) => item as any);
      repository.save.mockResolvedValue(created as any);

      const result = await service.createBatch('activity-1', items);

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(5);
      expect(result[1].count).toBe(10);
      expect(repository.create).toHaveBeenCalledTimes(2);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle items without notes', async () => {
      const items = [{ speciesId: 'species-1', count: 3 }];

      const created = [
        {
          ...mockActivityPlantItem,
          id: 'item-1',
          speciesId: 'species-1',
          count: 3,
          notes: null,
        },
      ];

      repository.create.mockImplementation(
        (item) =>
          ({
            ...item,
            notes: item.notes ?? null,
          }) as any,
      );
      repository.save.mockResolvedValue(created as any);

      const result = await service.createBatch('activity-1', items);

      expect(result).toHaveLength(1);
      expect(result[0].notes).toBeNull();
    });

    it('should handle empty items array', async () => {
      repository.create.mockImplementation(() => ({}) as any);
      repository.save.mockResolvedValue([] as any);

      const result = await service.createBatch('activity-1', []);

      expect(result).toEqual([]);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith([]);
    });

    it('should pass correct activity ID to created items', async () => {
      const items = [{ speciesId: 'species-1', count: 5 }];

      let capturedCreate: any;
      repository.create.mockImplementation((item) => {
        capturedCreate = item;
        return item as any;
      });
      repository.save.mockResolvedValue([mockActivityPlantItem] as any);

      await service.createBatch('activity-123', items);

      expect(capturedCreate.activityId).toBe('activity-123');
    });

    it('should preserve species IDs and counts', async () => {
      const items = [
        { speciesId: 'species-a', count: 7 },
        { speciesId: 'species-b', count: 14 },
      ];

      const createdItems: any[] = [];
      repository.create.mockImplementation((item) => {
        createdItems.push(item);
        return item as any;
      });
      repository.save.mockResolvedValue(createdItems as any);

      await service.createBatch('activity-1', items);

      expect(createdItems[0].speciesId).toBe('species-a');
      expect(createdItems[0].count).toBe(7);
      expect(createdItems[1].speciesId).toBe('species-b');
      expect(createdItems[1].count).toBe(14);
    });

    it('should call save with all created entities', async () => {
      const items = [
        { speciesId: 'species-1', count: 5 },
        { speciesId: 'species-2', count: 10 },
      ];

      let savedEntities: any;
      repository.create.mockImplementation((item) => item as any);
      repository.save.mockImplementation((entities) => {
        savedEntities = entities;
        return Promise.resolve(entities as any);
      });

      await service.createBatch('activity-1', items);

      expect(savedEntities).toHaveLength(2);
    });
  });

  describe('findByActivity', () => {
    it('should return all plant items for an activity', async () => {
      const items = [
        {
          ...mockActivityPlantItem,
          id: 'item-1',
          count: 5,
        },
        {
          ...mockActivityPlantItem,
          id: 'item-2',
          count: 10,
        },
      ];

      repository.find.mockResolvedValue(items as any);

      const result = await service.findByActivity('activity-1');

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(5);
      expect(result[1].count).toBe(10);
    });

    it('should return empty array when no items found', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByActivity('activity-nonexistent');

      expect(result).toEqual([]);
    });

    it('should include species relations', async () => {
      const items = [
        {
          ...mockActivityPlantItem,
          id: 'item-1',
          species: {
            id: 'species-1',
            nameId: 'AKASIA',
            category: 'tree',
          },
        },
      ];

      repository.find.mockResolvedValue(items as any);

      const result = await service.findByActivity('activity-1');

      expect(result).toHaveLength(1);
      expect(result[0].species).toBeDefined();
      expect(result[0].species.nameId).toBe('AKASIA');
    });

    it('should filter by correct activity ID', async () => {
      repository.find.mockResolvedValue([mockActivityPlantItem] as any);

      await service.findByActivity('activity-123');

      expect(repository.find).toHaveBeenCalledWith({
        where: { activityId: 'activity-123' },
        relations: ['species'],
      });
    });

    it('should load species relation', async () => {
      repository.find.mockResolvedValue([mockActivityPlantItem] as any);

      await service.findByActivity('activity-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { activityId: 'activity-1' },
        relations: ['species'],
      });
    });

    it('should handle multiple items with different species', async () => {
      const items = [
        {
          ...mockActivityPlantItem,
          id: 'item-1',
          speciesId: 'species-1',
          species: { id: 'species-1', nameId: 'AKASIA' },
        },
        {
          ...mockActivityPlantItem,
          id: 'item-2',
          speciesId: 'species-2',
          species: { id: 'species-2', nameId: 'BAMBU' },
        },
      ];

      repository.find.mockResolvedValue(items as any);

      const result = await service.findByActivity('activity-1');

      expect(result).toHaveLength(2);
      expect(result[0].species.nameId).toBe('AKASIA');
      expect(result[1].species.nameId).toBe('BAMBU');
    });

    it('should return items with all properties', async () => {
      const item = {
        id: 'item-1',
        activityId: 'activity-1',
        speciesId: 'species-1',
        count: 5,
        notes: 'Sample notes',
        created_at: new Date(),
        species: {
          id: 'species-1',
          nameId: 'AKASIA',
          category: 'tree',
        },
      };

      repository.find.mockResolvedValue([item] as any);

      const result = await service.findByActivity('activity-1');

      expect(result[0]).toEqual(item);
      expect(result[0].activityId).toBe('activity-1');
      expect(result[0].count).toBe(5);
      expect(result[0].notes).toBe('Sample notes');
    });
  });
});
