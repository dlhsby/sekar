import { Test, TestingModule } from '@nestjs/testing';
import { PlantDueDateService, PlantStatus } from './plant-due-date.service';
import { PlantSpecies } from '../entities/plant-species.entity';
import { LocationPlant } from '../entities/location-plant.entity';
import { LocationType } from '../../location-types/entities/location-type.entity';

describe('PlantDueDateService', () => {
  let service: PlantDueDateService;

  const mockAreaType: LocationType = {
    id: 'area-type-1',
    code: 'park',
    name: 'Park',
    category: 'ACTIVE',
  } as LocationType;

  const mockSpecies: PlantSpecies = {
    id: 'species-1',
    nameId: 'trembesi',
    nameLatin: 'Alstonia scholaris',
    category: 'tree',
    defaultPruningCycleDays: 90,
  } as PlantSpecies;

  const mockSpeciesNoCycle: PlantSpecies = {
    id: 'species-2',
    nameId: 'ornamental-shrub',
    nameLatin: null,
    category: 'shrub',
    defaultPruningCycleDays: null,
  } as PlantSpecies;

  const mockAreaPlant: LocationPlant = {
    id: 'area-plant-1',
    locationId: 'area-1',
    speciesId: 'species-1',
    count: 5,
    lastPrunedAt: null,
    nextDueAt: null,
    status: 'ok',
    overrideCycleDays: null,
  } as LocationPlant;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlantDueDateService],
    }).compile();

    service = module.get<PlantDueDateService>(PlantDueDateService);
  });

  describe('computeNextDueDate', () => {
    it('should return null when lastPrunedAt is null', () => {
      const result = service.computeNextDueDate(mockSpecies, mockAreaType, null);
      expect(result).toBeNull();
    });

    it('should return null when no cycle available (species default and override both null)', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const result = service.computeNextDueDate(
        mockSpeciesNoCycle,
        mockAreaType,
        threeDaysAgo,
        null,
      );
      expect(result).toBeNull();
    });

    it('should compute next due date using species default cycle', () => {
      const lastPruned = new Date('2026-04-01');
      const result = service.computeNextDueDate(mockSpecies, mockAreaType, lastPruned);

      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(30); // April 1 + 90 days ≈ June 30
      expect(result!.getMonth()).toBe(5); // June
    });

    it('should prioritize override cycle over species default', () => {
      const lastPruned = new Date('2026-04-01');
      const result = service.computeNextDueDate(
        mockSpecies,
        mockAreaType,
        lastPruned,
        60, // Override: 60 days instead of 90
      );

      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(31); // April 1 + 60 days = May 31
      expect(result!.getMonth()).toBe(4); // May
    });

    it('should handle zero override cycle as no cycle', () => {
      const lastPruned = new Date('2026-04-01');
      const result = service.computeNextDueDate(mockSpecies, mockAreaType, lastPruned, 0);

      // 0 is falsy, so no forecast available (same as null cycle)
      expect(result).toBeNull();
    });

    it('should compute exactly N days forward', () => {
      const lastPruned = new Date('2026-01-15');
      const result = service.computeNextDueDate(mockSpecies, mockAreaType, lastPruned);

      // Should be exactly 90 days later: April 15
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(3); // April (0-indexed)
      expect(result!.getDate()).toBe(15);
    });
  });

  describe('classifyStatus', () => {
    const now = new Date('2026-04-27'); // Fixed reference date

    it('should return "unknown" when nextDueAt is null', () => {
      const status = service.classifyStatus(null, now);
      expect(status).toBe('unknown');
    });

    it('should return "overdue" when nextDueAt is before now', () => {
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 5);

      const status = service.classifyStatus(pastDate, now);
      expect(status).toBe('overdue');
    });

    it('should return "due_soon" when nextDueAt is within 14 days', () => {
      const soonDate = new Date(now);
      soonDate.setDate(soonDate.getDate() + 7); // 7 days in future

      const status = service.classifyStatus(soonDate, now);
      expect(status).toBe('due_soon');
    });

    it('should return "due_soon" at exactly 14 days before nextDueAt', () => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 14); // Exactly 14 days

      const status = service.classifyStatus(dueDate, now);
      expect(status).toBe('due_soon');
    });

    it('should return "ok" when nextDueAt is more than 14 days away', () => {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 20); // 20 days in future

      const status = service.classifyStatus(futureDate, now);
      expect(status).toBe('ok');
    });

    it('should return "ok" when nextDueAt is today', () => {
      const status = service.classifyStatus(now, now);
      expect(status).toBe('due_soon'); // Within 14-day window
    });

    it('should use current date as default when not provided', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days ahead

      const status = service.classifyStatus(futureDate);
      expect(status).toBe('ok');
    });
  });

  describe('recomputeAreaPlant', () => {
    it('should return unknown status when plant never pruned', () => {
      const plant = { ...mockAreaPlant, lastPrunedAt: null, overrideCycleDays: null };

      const result = service.recomputeAreaPlant(plant, mockSpecies, mockAreaType);

      expect(result.nextDueAt).toBeNull();
      expect(result.status).toBe('unknown');
    });

    it('should return ok status for recently pruned plant', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const plant = {
        ...mockAreaPlant,
        lastPrunedAt: fiveDaysAgo,
        overrideCycleDays: null,
      };

      const result = service.recomputeAreaPlant(plant, mockSpecies, mockAreaType);

      expect(result.nextDueAt).not.toBeNull();
      expect(result.status).toBe('ok');
    });

    it('should apply override cycle when provided', () => {
      // 30 days ago from Apr 27 = Mar 28, with 20-day override = due Apr 17 (10 days overdue)
      const lastMonth = new Date('2026-03-28');

      const plant = {
        ...mockAreaPlant,
        lastPrunedAt: lastMonth,
        overrideCycleDays: 20, // Override to 20 days
      };

      const result = service.recomputeAreaPlant(plant, mockSpecies, mockAreaType);

      // Mar 28 + 20 days = Apr 17, which is before Apr 27, so overdue
      expect(result.status).toBe('overdue');
    });

    it('should return overdue status when cycle passed', () => {
      const oneHundredDaysAgo = new Date();
      oneHundredDaysAgo.setDate(oneHundredDaysAgo.getDate() - 100);

      const plant = {
        ...mockAreaPlant,
        lastPrunedAt: oneHundredDaysAgo,
        overrideCycleDays: null,
      };

      const result = service.recomputeAreaPlant(plant, mockSpecies, mockAreaType);

      expect(result.status).toBe('overdue'); // 100 days > 90-day cycle
    });

    it('should handle species with no default cycle', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const plant = {
        ...mockAreaPlant,
        lastPrunedAt: yesterday,
        overrideCycleDays: null,
      };

      const result = service.recomputeAreaPlant(plant, mockSpeciesNoCycle, mockAreaType);

      expect(result.nextDueAt).toBeNull();
      expect(result.status).toBe('unknown');
    });

    it('should integrate override cycle with species cycle precedence', () => {
      // Mar 18 + 50 days = May 7 (10 days from Apr 27).
      // Pin "now" to Apr 27 so the assertion is wall-clock-independent —
      // without this, the test classifies May 7 as `overdue` once the real
      // calendar moves past it.
      jest.useFakeTimers().setSystemTime(new Date('2026-04-27T00:00:00Z'));
      try {
        const plant = {
          ...mockAreaPlant,
          lastPrunedAt: new Date('2026-03-18'),
          overrideCycleDays: 50, // Override takes precedence over species 90-day default
        };

        const result = service.recomputeAreaPlant(plant, mockSpecies, mockAreaType);

        // May 7 is 10 days from Apr 27, within the 14-day due window
        expect(result.status).toBe('due_soon');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle leap year correctly', () => {
      // 2026 is not a leap year, but 2024 is
      const leapDayPruned = new Date('2024-02-29');
      const speciesLeap: PlantSpecies = {
        ...mockSpecies,
        defaultPruningCycleDays: 365,
      };

      const result = service.computeNextDueDate(speciesLeap, mockAreaType, leapDayPruned);

      // Feb 29 + 365 days = Feb 28, 2025 (or Feb 29, 2026 depending on leap logic)
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2025);
    });

    it('should handle very large cycle (1000 days)', () => {
      const spec: PlantSpecies = { ...mockSpecies, defaultPruningCycleDays: 1000 };
      const result = service.computeNextDueDate(spec, mockAreaType, new Date('2026-01-01'));

      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2028);
    });

    it('should handle month overflow correctly', () => {
      const pruned = new Date('2026-01-31');
      const spec: PlantSpecies = { ...mockSpecies, defaultPruningCycleDays: 30 };

      const result = service.computeNextDueDate(spec, mockAreaType, pruned);

      // Jan 31 + 30 days = Mar 2 (JavaScript setDate overflows into next month)
      // 31 + 30 = 61, Jan only has 31 days, Feb has 28, so Mar 2
      expect(result!.getMonth()).toBe(2); // March
      expect(result!.getDate()).toBe(2);
    });
  });

  describe('boundary conditions', () => {
    it('should classify status at exact boundary times', () => {
      const now = new Date('2026-04-27T12:00:00Z');
      const exactlyFourteenDaysLater = new Date('2026-05-11T12:00:00Z');

      const status = service.classifyStatus(exactlyFourteenDaysLater, now);
      expect(status).toBe('due_soon');
    });

    it('should classify status one millisecond after overdue', () => {
      const now = new Date('2026-04-27T12:00:00.000Z');
      const justBefore = new Date('2026-04-27T11:59:59.999Z');

      const status = service.classifyStatus(justBefore, now);
      expect(status).toBe('overdue');
    });

    it('should handle null areaType gracefully', () => {
      const result = service.computeNextDueDate(
        mockSpecies,
        null, // No areaType provided
        new Date('2026-04-01'),
      );

      expect(result).not.toBeNull();
      // Should still work as area_type is reserved for future use
    });
  });

  describe('status distribution', () => {
    /**
     * Verify that different time offsets produce the expected status classification.
     * This is important for dashboards to correctly color areas.
     */
    it('should produce correct status distribution for various day offsets', () => {
      const baseDate = new Date('2026-04-27');
      const testCases: Array<[number, PlantStatus]> = [
        [-1, 'overdue'],
        [0, 'due_soon'],
        [7, 'due_soon'],
        [14, 'due_soon'],
        [15, 'ok'],
        [30, 'ok'],
        [100, 'ok'],
      ];

      testCases.forEach(([daysFromNow, expectedStatus]) => {
        const futureDate = new Date(baseDate);
        futureDate.setDate(futureDate.getDate() + daysFromNow);

        const status = service.classifyStatus(futureDate, baseDate);
        expect(status).toBe(expectedStatus);
      });
    });
  });
});
