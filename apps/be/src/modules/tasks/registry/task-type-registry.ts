import { Injectable } from '@nestjs/common';
import { z, ZodSchema } from 'zod';

export const PRUNING_CASE_TYPES = ['GT', 'PT', 'PS', 'PD', 'PK'] as const;
export const PRUNING_ACTIONS = ['PM', 'PB', 'PC'] as const;
export const PRUNING_SOURCES = ['TIW', 'TS', 'CC', 'PW', 'Wk'] as const;

export type TaskTypeName = 'generic' | 'pruning' | 'planting' | 'cleaning';

const pruningSchema = z.object({
  location_type: z.enum(['road', 'park', 'median']),
  pruning_action: z.enum(PRUNING_ACTIONS),
  source: z.enum(PRUNING_SOURCES),
  target_species: z
    .array(
      z.object({
        species_id: z.string().uuid(),
        count: z.number().int().positive(),
      }),
    )
    .optional(),
  damage_cause: z.string().optional(),
  notes: z.string().optional(),
});

const plantingSchema = z.object({
  planting_type: z.enum(['new', 'replacement']),
  notes: z.string().optional(),
});

const cleaningSchema = z.object({
  location_type: z.enum(['road', 'park', 'median', 'drainage']).optional(),
  notes: z.string().optional(),
});

const genericSchema = z.object({}).passthrough();

/**
 * Registry that maps task_type strings to their Zod validation schemas.
 * Unknown task types fall through to the generic passthrough schema.
 */
@Injectable()
export class TaskTypeRegistry {
  private readonly schemas = new Map<string, ZodSchema>([
    ['pruning', pruningSchema],
    ['planting', plantingSchema],
    ['cleaning', cleaningSchema],
    ['generic', genericSchema],
  ]);

  /**
   * Validate custom_fields against the schema for the given task type.
   * Throws a ZodError if validation fails.
   */
  validate(taskType: string, customFields: unknown): void {
    const schema = this.schemas.get(taskType) ?? genericSchema;
    schema.parse(customFields);
  }

  isKnownType(taskType: string): boolean {
    return this.schemas.has(taskType);
  }

  getSupportedTypes(): string[] {
    return [...this.schemas.keys()];
  }
}
