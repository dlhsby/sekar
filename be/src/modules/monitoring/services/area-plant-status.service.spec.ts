import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AreaPlantStatusService } from './area-plant-status.service';
import { PlantDueDateService } from '../../plants/services/plant-due-date.service';
import { AreaPlant } from '../../plants/entities/area-plant.entity';
import { PlantSpecies } from '../../plants/entities/plant-species.entity';
import { Area } from '../../areas/entities/area.entity';
import { AreaType } from '../../area-types/entities/area-type.entity';

describe('AreaPlantStatusService', () => {
  let service: AreaPlantStatusService;
  let areaPlantRepository: jest.Mocked<Repository<AreaPlant>>;
  let areaRepository: jest.Mocked<Repository<Area>>;
  let plantDueDateService: jest.Mocked<PlantDueDateService>;

  const mockAreaType: AreaType = {
    id: 'area-type-1',
    code: 'park',
    name: 'Park',
    category: 'ACTIVE',
  } as AreaType;

  const mockArea: Area = {
    id: 'area-1',
    name: 'Taman Bungkul',
    area_type_id: 'area-type-1',
    areaType: mockAreaType,
    gps_lat: -7.25,
    gps_lng: 112.75,
    radius_meters: 100,
    is_active: true,
  } as Area;

  const mockSpecies1: PlantSpecies = {
    id: 'species-1',
    nameId: 'trembesi',
    nameLatin: 'Alstonia scholaris',
    category: 'tree',
    defaultPruningCycleDays: 90,
  } as PlantSpecies;

  const mockSpecies2: PlantSpecies = {
    id: 'species-2',
    nameId: 'bougainvillea',
    nameLatin: 'Bougainvillea spp.',
    category: 'shrub',
    defaultPruningCycleDays: 60,
  } as PlantSpecies;

  const mockAreaPlant1: AreaPlant = {
    id: 'ap-1',
    areaId: 'area-1',
    speciesId: 'species-1',
    count: 5,
    lastPrunedAt: new Date('2026-02-01'), // 85 days ago from Apr 27
    nextDueAt: new Date('2026-05-01'),
    status: 'ok',
    overrideCycleDays: null,
    species: mockSpecies1,
    area: mockArea,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AreaPlant;

  const mockAreaPlant2: AreaPlant = {
    id: 'ap-2',
    areaId: 'area-1',
    speciesId: 'species-2',
    count: 8,
    lastPrunedAt: new Date('2026-03-28'), // 30 days ago from Apr 27
    nextDueAt: new Date('2026-05-27'),
    status: 'due_soon',
    overrideCycleDays: null,
    species: mockSpecies2,
    area: mockArea,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AreaPlant;

  const mockAreaPlant3: AreaPlant = {
    id: 'ap-3',
    areaId: 'area-1',
    speciesId: 'species-1',
    count: 3,
    lastPrunedAt: null, // Never pruned
    nextDueAt: null,
    status: 'unknown',
    overrideCycleDays: null,
    species: mockSpecies1,
    area: mockArea,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AreaPlant;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaPlantStatusService,
        {
          provide: getRepositoryToken(AreaPlant),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Area),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: PlantDueDateService,
          useValue: {
            recomputeAreaPlant: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AreaPlantStatusService>(AreaPlantStatusService);
    areaPlantRepository = module.get(getRepositoryToken(AreaPlant));
    areaRepository = module.get(getRepositoryToken(Area));
    plantDueDateService = module.get(PlantDueDateService);
  });

  describe('getAreaPlantStatus', () => {
    it('should throw NotFoundException when area does not exist', async () => {
      areaRepository.findOne.mockResolvedValue(null);

      await expect(service.getAreaPlantStatus('nonexistent-area')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should load area with areaType relation', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([]);

      await service.getAreaPlantStatus('area-1');

      expect(areaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'area-1' },
        relations: ['areaType'],
      });
    });

    it('should load area plants with species relation', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1]);

      plantDueDateService.recomputeAreaPlant.mockReturnValue({
        nextDueAt: new Date('2026-05-01'),
        status: 'ok',
      });

      await service.getAreaPlantStatus('area-1');

      expect(areaPlantRepository.find).toHaveBeenCalledWith({
        where: { areaId: 'area-1' },
        relations: ['species'],
      });
    });

    it('should return correct response structure', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1, mockAreaPlant2]);

      plantDueDateService.recomputeAreaPlant
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-01'),
          status: 'ok',
        })
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-27'),
          status: 'due_soon',
        });

      const result = await service.getAreaPlantStatus('area-1');

      expect(result).toHaveProperty('areaId', 'area-1');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('due_soon');
      expect(result).toHaveProperty('overdue');
      expect(result).toHaveProperty('unknown');
      expect(result).toHaveProperty('plants');
      expect(Array.isArray(result.plants)).toBe(true);
    });

    it('should aggregate status counts correctly', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1, mockAreaPlant2, mockAreaPlant3]);

      plantDueDateService.recomputeAreaPlant
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-01'),
          status: 'ok',
        })
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-27'),
          status: 'due_soon',
        })
        .mockReturnValueOnce({
          nextDueAt: null,
          status: 'unknown',
        });

      const result = await service.getAreaPlantStatus('area-1');

      expect(result.ok).toBe(1);
      expect(result.due_soon).toBe(1);
      expect(result.overdue).toBe(0);
      expect(result.unknown).toBe(1);
      expect(result.total).toBe(5 + 8 + 3); // Sum of all counts
    });

    it('should build per-species breakdown correctly', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1, mockAreaPlant2]);

      plantDueDateService.recomputeAreaPlant
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-01'),
          status: 'ok',
        })
        .mockReturnValueOnce({
          nextDueAt: new Date('2026-05-27'),
          status: 'due_soon',
        });

      const result = await service.getAreaPlantStatus('area-1');

      expect(result.plants).toHaveLength(2);
      expect(result.plants[0]).toEqual({
        speciesId: 'species-1',
        speciesName: 'trembesi',
        count: 5,
        nextDueAt: new Date('2026-05-01'),
        status: 'ok',
      });
      expect(result.plants[1]).toEqual({
        speciesId: 'species-2',
        speciesName: 'bougainvillea',
        count: 8,
        nextDueAt: new Date('2026-05-27'),
        status: 'due_soon',
      });
    });

    it('should compute total count from all plants', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1, mockAreaPlant2, mockAreaPlant3]);

      plantDueDateService.recomputeAreaPlant.mockReturnValue({
        nextDueAt: new Date('2026-05-01'),
        status: 'ok',
      });

      const result = await service.getAreaPlantStatus('area-1');

      expect(result.total).toBe(16); // 5 + 8 + 3
    });

    it('should handle empty area plants', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([]);

      const result = await service.getAreaPlantStatus('area-1');

      expect(result.total).toBe(0);
      expect(result.ok).toBe(0);
      expect(result.due_soon).toBe(0);
      expect(result.overdue).toBe(0);
      expect(result.unknown).toBe(0);
      expect(result.plants).toHaveLength(0);
    });

    it('should pass area-type to recomputeAreaPlant', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([mockAreaPlant1]);

      plantDueDateService.recomputeAreaPlant.mockReturnValue({
        nextDueAt: new Date('2026-05-01'),
        status: 'ok',
      });

      await service.getAreaPlantStatus('area-1');

      expect(plantDueDateService.recomputeAreaPlant).toHaveBeenCalledWith(
        mockAreaPlant1,
        mockAreaPlant1.species,
        mockAreaType,
      );
    });

    it('should handle all status types in aggregation', async () => {
      const plant1 = { ...mockAreaPlant1, count: 2 } as AreaPlant;
      const plant2 = { ...mockAreaPlant2, count: 3 } as AreaPlant;
      const plant3 = { ...mockAreaPlant1, id: 'ap-3', status: 'overdue', count: 1 } as AreaPlant;
      const plant4 = { ...mockAreaPlant1, id: 'ap-4', status: 'unknown', count: 4 } as AreaPlant;

      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([plant1, plant2, plant3, plant4]);

      plantDueDateService.recomputeAreaPlant
        .mockReturnValueOnce({ nextDueAt: new Date(), status: 'ok' })
        .mockReturnValueOnce({ nextDueAt: new Date(), status: 'due_soon' })
        .mockReturnValueOnce({ nextDueAt: new Date(), status: 'overdue' })
        .mockReturnValueOnce({ nextDueAt: null, status: 'unknown' });

      const result = await service.getAreaPlantStatus('area-1');

      expect(result.ok).toBe(1);
      expect(result.due_soon).toBe(1);
      expect(result.overdue).toBe(1);
      expect(result.unknown).toBe(1);
      expect(result.total).toBe(2 + 3 + 1 + 4);
    });

    it('should log when computing plant status', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      areaPlantRepository.find.mockResolvedValue([]);

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.getAreaPlantStatus('area-1');

      expect(logSpy).toHaveBeenCalledWith('Computing plant status for area: area-1');
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundException with correct error message', async () => {
      areaRepository.findOne.mockResolvedValue(null);

      try {
        await service.getAreaPlantStatus('invalid-id');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('invalid-id');
      }
    });

    it('should handle database errors gracefully', async () => {
      areaRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getAreaPlantStatus('area-1')).rejects.toThrow('Database error');
    });
  });
});
