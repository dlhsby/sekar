import type { Scenario } from '../types';
import { ATTENDANCE } from './attendance';
import { INTEGRITY } from './integrity';
import { LIFECYCLE } from './lifecycle';
import { MAPMODES } from './mapmodes';
import { MONITORING } from './monitoring';
import { PRESENCE } from './presence';
import { SCHEDULING } from './scheduling';

/**
 * The whole catalog. Because every scenario carries its own expectations, a
 * coverage hole is findable rather than assumed:
 *
 *   CATALOG.filter((s) => s.expect.length === 0)   // arranged but never asserted
 *   CATALOG.filter((s) => s.guards)                // regression guards
 */
export const CATALOG: Scenario[] = [
  ...SCHEDULING,
  ...MONITORING,
  ...MAPMODES,
  ...LIFECYCLE,
  ...PRESENCE,
  ...ATTENDANCE,
  ...INTEGRITY,
];

/** Scenarios that must fail against the code from before their fix. */
export const REGRESSION_GUARDS = CATALOG.filter((s) => s.guards);

export function assertCatalogIsSound(): void {
  const ids = new Set<string>();
  for (const s of CATALOG) {
    if (ids.has(s.id)) throw new Error(`Duplicate scenario id: ${s.id}`);
    ids.add(s.id);
    if (s.expect.length === 0) {
      throw new Error(`${s.id} arranges data but asserts nothing — it would pass vacuously.`);
    }
  }
}
