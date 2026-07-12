/** Importable CSV entity types (Phase 4-5 §F). */
export type CsvImportEntity = 'users' | 'areas';

/**
 * Column headers per importable entity.
 *
 * NOTE: the areas template extends the spec table with `location_type_id` and makes
 * latitude/longitude required, because the `areas` table enforces those columns
 * NOT NULL — an import omitting them could never commit.
 */
export const CSV_TEMPLATES: Record<CsvImportEntity, string[]> = {
  users: [
    'username',
    'full_name',
    'phone_number',
    'role',
    'password',
    'location_id',
    'rayon_id',
    'employee_id',
  ],
  areas: [
    'name',
    'location_type_id',
    'rayon_id',
    'address',
    'latitude',
    'longitude',
    'radius_meters',
  ],
};

export const CSV_IMPORT_ENTITIES: CsvImportEntity[] = ['users', 'areas'];

export function isCsvImportEntity(value: string): value is CsvImportEntity {
  return CSV_IMPORT_ENTITIES.includes(value as CsvImportEntity);
}

/** Build an empty CSV template (header row only) for the given entity. */
export function buildTemplate(entity: CsvImportEntity): string {
  return `﻿${CSV_TEMPLATES[entity].join(',')}\r\n`;
}
