/**
 * Data Models — barrel re-export.
 *
 * Split by domain (Phase 4 UAT-readiness refactor); import either from the
 * domain file or from here — both resolve to the same types, so existing
 * `from '../types/models.types'` imports keep working unchanged.
 *
 * Phase 2C: ADR-009 (8-role system), ADR-010 (terminology cleanup).
 */
export * from './geo.types';
export * from './user.types';
export * from './shift.types';
export * from './activity.types';
export * from './task.types';
export * from './overtime.types';
export * from './pruning-request.types';
export * from './monitoring.types';
export * from './plant.types';
export * from './common.types';
