/**
 * Guard: every relation path used in a TypeORM QueryBuilder must exist.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/monitoring/attendance` shipped returning HTTP 500 on every call. The query
 * joined `shift.location`, but the Area→Location rename moved the COLUMN to
 * `location_id` while leaving the entity PROPERTY as `area`, and TypeORM
 * resolves join paths by property name:
 *
 *   TypeORMError: Relation with property path location in entity was not found.
 *
 * Twenty unit tests passed throughout, because they mock `createQueryBuilder`.
 * A mocked builder never consults entity metadata, so a wrong path cannot fail
 * there — those tests assert what the code does with results, never that the
 * query is answerable at all.
 *
 * HOW IT WORKS, WITHOUT A DATABASE
 * --------------------------------
 * TypeORM registers every `@ManyToOne` / `@OneToMany` / `@ManyToMany` into a
 * global metadata store when an entity module is imported. Importing the entity
 * files is therefore enough to read the real relation names — no connection, no
 * schema, no fixtures.
 *
 * Aliases are resolved PER FILE rather than from a shared table, because they
 * are genuinely ambiguous across the codebase: `t` is `taskRepository` in one
 * file and `activityTagRepository` in another. A global alias→entity map would
 * report false failures, and a guard that cries wolf gets switched off.
 *
 * Resolution chain, all within one file:
 *   @InjectRepository(Shift) … shiftsRepository   →  shiftsRepository = Shift
 *   this.shiftsRepository.createQueryBuilder('shift')  →  alias shift = Shift
 *   .leftJoinAndSelect('shift.area', …)  →  Shift must declare relation `area`
 *
 * Anything this chain cannot resolve is SKIPPED, not failed — an unresolved
 * alias means the guard lacks evidence, not that the code is wrong. The count
 * of checked paths is asserted so the scan can never silently degrade to
 * checking nothing.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';

const SRC = join(__dirname, '..', '..');

function walk(dir: string, match: (name: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'node_modules' && name !== '__tests__') walk(full, match, out);
    } else if (match(name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Import every entity so its decorators register. Without this the metadata
 * store only contains whatever this spec happens to have pulled in, and the
 * guard would pass by knowing nothing.
 */
function loadEntities(): void {
  for (const file of walk(SRC, (n) => n.endsWith('.entity.ts'))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(file);
  }
}

/** entity class name → its relation property names. */
function relationsByEntity(): Map<string, Set<string>> {
  const byName = new Map<string, Set<string>>();
  for (const rel of getMetadataArgsStorage().relations) {
    // `target` is the declaring class; TypeORM types it loosely, and a string
    // target (entity schemas) has no relations to read.
    const target = rel.target as { name?: string } | string;
    if (typeof target !== 'function' || typeof target.name !== 'string') continue;
    const set = byName.get(target.name) ?? new Set<string>();
    set.add(rel.propertyName);
    byName.set(target.name, set);
  }
  return byName;
}

interface JoinUse {
  file: string;
  alias: string;
  property: string;
  entity: string;
}

const INJECT_RE = /@InjectRepository\(\s*(\w+)\s*\)\s*(?:private\s+)?(?:readonly\s+)?(\w+)/g;
const QB_RE = /(?:this\.)?(\w+)\s*\.\s*createQueryBuilder\(\s*'(\w+)'/g;
const JOIN_RE = /\.(?:leftJoin|innerJoin|leftJoinAndSelect|innerJoinAndSelect)\(\s*'(\w+)\.(\w+)'/g;

function collect(): { resolved: JoinUse[]; unresolvedAliases: Set<string> } {
  const resolved: JoinUse[] = [];
  const unresolvedAliases = new Set<string>();

  for (const file of walk(SRC, (n) => n.endsWith('.ts') && !n.endsWith('.spec.ts'))) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('createQueryBuilder')) continue;

    const repoToEntity = new Map<string, string>();
    for (const m of src.matchAll(INJECT_RE)) repoToEntity.set(m[2], m[1]);

    const aliasToEntity = new Map<string, string>();
    for (const m of src.matchAll(QB_RE)) {
      const entity = repoToEntity.get(m[1]);
      if (entity) aliasToEntity.set(m[2], entity);
    }

    const short = file.split('/src/')[1] ?? file;
    for (const m of src.matchAll(JOIN_RE)) {
      const [, alias, property] = m;
      const entity = aliasToEntity.get(alias);
      if (!entity) {
        unresolvedAliases.add(`${short}:${alias}`);
        continue;
      }
      resolved.push({ file: short, alias, property, entity });
    }
  }
  return { resolved, unresolvedAliases };
}

describe('TypeORM QueryBuilder join paths', () => {
  let relations: Map<string, Set<string>>;
  let resolved: JoinUse[];
  let unresolvedAliases: Set<string>;

  beforeAll(() => {
    loadEntities();
    relations = relationsByEntity();
    ({ resolved, unresolvedAliases } = collect());
  });

  it('loads entity metadata to check against', () => {
    // If entity loading silently failed, every join below would "pass" by
    // being unresolvable. Assert we actually know some entities.
    expect(relations.size).toBeGreaterThan(10);
  });

  it('resolves a meaningful number of join paths', () => {
    // Guards against the scan degrading to nothing after a refactor — e.g. a
    // repository-naming change that breaks alias resolution everywhere.
    expect(resolved.length).toBeGreaterThanOrEqual(20);
  });

  it('every joined property is a real relation on its entity', () => {
    const bad = resolved
      .filter(({ entity, property }) => {
        const rels = relations.get(entity);
        // An entity with no registered relations means the class name did not
        // resolve; skip rather than invent a failure.
        return rels != null && !rels.has(property);
      })
      .map(
        ({ file, alias, property, entity }) =>
          `${file}: '${alias}.${property}' — ${entity} has no such relation ` +
          `(has: ${[...(relations.get(entity) ?? [])].sort().join(', ')})`,
      );

    expect(bad).toEqual([]);
  });

  /**
   * The specific regression, pinned by name so its failure message points at
   * the cause rather than at a generic list.
   */
  it('Shift exposes its location relation as `area`, not `location`', () => {
    const shift = relations.get('Shift');
    expect(shift?.has('area')).toBe(true);
    expect(shift?.has('location')).toBe(false);
  });

  it('reports what it could not resolve, for visibility', () => {
    // Not a failure: unresolved means "no evidence", e.g. a QueryBuilder built
    // from a DataSource rather than an injected repository. Printed so the
    // blind spot stays visible instead of looking like coverage.
    if (unresolvedAliases.size > 0) {
      console.info(
        `[join-path guard] ${unresolvedAliases.size} alias(es) not resolvable from an ` +
          `@InjectRepository in the same file: ${[...unresolvedAliases].sort().join(', ')}`,
      );
    }
    expect(true).toBe(true);
  });
});
