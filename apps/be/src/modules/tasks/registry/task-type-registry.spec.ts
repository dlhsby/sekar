import { ZodError } from 'zod';
import {
  TaskTypeRegistry,
  PRUNING_ACTIONS,
  PRUNING_CASE_TYPES,
  PRUNING_SOURCES,
} from './task-type-registry';

describe('TaskTypeRegistry', () => {
  let registry: TaskTypeRegistry;

  beforeEach(() => {
    registry = new TaskTypeRegistry();
  });

  describe('constants', () => {
    it('exposes pruning enums', () => {
      expect(PRUNING_ACTIONS).toEqual(['PM', 'PB', 'PC']);
      expect(PRUNING_CASE_TYPES).toEqual(['GT', 'PT', 'PS', 'PD', 'PK']);
      expect(PRUNING_SOURCES).toEqual(['TIW', 'TS', 'CC', 'PW', 'Wk']);
    });
  });

  describe('isKnownType', () => {
    it.each(['pruning', 'planting', 'cleaning', 'generic'])('returns true for %s', (t) =>
      expect(registry.isKnownType(t)).toBe(true),
    );

    it('returns false for unknown type', () => {
      expect(registry.isKnownType('mystery')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('returns all four canonical types', () => {
      expect(registry.getSupportedTypes().sort()).toEqual(
        ['cleaning', 'generic', 'planting', 'pruning'].sort(),
      );
    });
  });

  describe('validate', () => {
    it('accepts a valid pruning payload', () => {
      expect(() =>
        registry.validate('pruning', {
          location_type: 'road',
          pruning_action: 'PM',
          source: 'TIW',
          target_species: [{ species_id: '3b9f8e8e-5c2f-4a3b-9d2e-7f1a8b6c4d5e', count: 2 }],
          notes: 'minor branch trim',
        }),
      ).not.toThrow();
    });

    it('rejects pruning with bad enum', () => {
      expect(() =>
        registry.validate('pruning', {
          location_type: 'highway',
          pruning_action: 'PM',
          source: 'TIW',
        }),
      ).toThrow(ZodError);
    });

    it('rejects pruning with bad species uuid', () => {
      expect(() =>
        registry.validate('pruning', {
          location_type: 'park',
          pruning_action: 'PB',
          source: 'TS',
          target_species: [{ species_id: 'not-a-uuid', count: 1 }],
        }),
      ).toThrow(ZodError);
    });

    it('rejects pruning with non-positive count', () => {
      expect(() =>
        registry.validate('pruning', {
          location_type: 'median',
          pruning_action: 'PC',
          source: 'CC',
          target_species: [{ species_id: '3b9f8e8e-5c2f-4a3b-9d2e-7f1a8b6c4d5e', count: 0 }],
        }),
      ).toThrow(ZodError);
    });

    it('accepts a valid planting payload', () => {
      expect(() => registry.validate('planting', { planting_type: 'new' })).not.toThrow();
    });

    it('rejects planting with bad type', () => {
      expect(() => registry.validate('planting', { planting_type: 'mystery' })).toThrow(ZodError);
    });

    it('accepts a valid cleaning payload with optional location_type', () => {
      expect(() => registry.validate('cleaning', { location_type: 'drainage' })).not.toThrow();
      expect(() => registry.validate('cleaning', {})).not.toThrow();
    });

    it('falls through to generic passthrough for unknown task types', () => {
      expect(() => registry.validate('mystery_type', { anything: 123, foo: 'bar' })).not.toThrow();
    });

    it('accepts arbitrary keys on generic schema', () => {
      expect(() =>
        registry.validate('generic', { whatever: true, nested: { a: 1 } }),
      ).not.toThrow();
    });
  });
});
