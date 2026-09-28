import { buildAuditRow, type CaptureInput } from './audit-row';
import { REDACTED } from './audit-diff';

const options = { type: 'district', label: (e: Record<string, unknown>) => e.name as string };
const store = {
  userId: 'u-1',
  role: 'management',
  name: 'Management Satu',
  ip: '10.0.0.1',
  userAgent: 'jest',
  requestId: 'req-1',
};

const base = (over: Partial<CaptureInput>): CaptureInput => ({
  kind: 'create',
  options,
  entityId: 'd-1',
  before: null,
  after: { id: 'd-1', name: 'Rayon Timur' },
  relations: new Set(),
  store,
  ...over,
});

describe('buildAuditRow', () => {
  it('create: snapshots the new row with actor + request context', () => {
    expect(buildAuditRow(base({}))).toMatchObject({
      entity_type: 'district',
      entity_id: 'd-1',
      entity_label: 'Rayon Timur',
      action: 'create',
      actor_id: 'u-1',
      actor_role: 'management',
      actor_name: 'Management Satu',
      new_value: { id: 'd-1', name: 'Rayon Timur' },
      old_value: null,
      changes: null,
      outcome: 'success',
      source: 'api',
      ip: '10.0.0.1',
      request_id: 'req-1',
    });
  });

  it('update: stores only the diff', () => {
    const row = buildAuditRow(
      base({
        kind: 'update',
        before: { id: 'd-1', name: 'Rayon Timur', is_active: true },
        after: { id: 'd-1', name: 'Rayon Timur Raya', is_active: true },
      }),
    );
    expect(row?.changes).toEqual({ name: ['Rayon Timur', 'Rayon Timur Raya'] });
    expect(row?.old_value).toBeNull();
    expect(row?.new_value).toBeNull();
    expect(row?.entity_label).toBe('Rayon Timur Raya');
  });

  it('update touching only bookkeeping columns is not recorded', () => {
    const row = buildAuditRow(
      base({
        kind: 'update',
        before: { id: 'd-1', name: 'A', updated_at: new Date(1) },
        after: { id: 'd-1', name: 'A', updated_at: new Date(2) },
        updatedColumns: ['updated_at'],
      }),
    );
    expect(row).toBeNull();
  });

  it('password change is recorded without revealing the value', () => {
    const row = buildAuditRow(
      base({
        options: { type: 'user', label: (e) => e.username as string },
        kind: 'update',
        before: { id: 'u-9', username: 'budi', password_hash: 'old' },
        after: { id: 'u-9', username: 'budi', password_hash: 'new' },
        updatedColumns: ['password_hash'],
      }),
    );
    expect(row?.changes).toEqual({ password_hash: [REDACTED, REDACTED] });
  });

  it('delete keeps the last state and the operator reason', () => {
    const row = buildAuditRow(
      base({
        kind: 'delete',
        before: { id: 'd-1', name: 'Rayon Timur' },
        after: { id: 'd-1', name: 'Rayon Timur' },
        store: { ...store, reason: 'Duplikat', parentId: 'a-0' },
      }),
    );
    expect(row).toMatchObject({
      action: 'delete',
      old_value: { id: 'd-1', name: 'Rayon Timur' },
      reason: 'Duplikat',
      parent_id: 'a-0',
    });
  });

  it('system work (no actor) is marked as source=system', () => {
    expect(buildAuditRow(base({ store: {} }))).toMatchObject({ actor_id: null, source: 'system' });
  });

  it('a throwing label never fails the capture', () => {
    const row = buildAuditRow(
      base({
        options: {
          type: 'district',
          label: () => {
            throw new Error('boom');
          },
        },
      }),
    );
    expect(row?.entity_label).toBeNull();
  });
});

describe('buildAuditRow — column filtering', () => {
  it('keeps only mapped columns and drops ignored ones', () => {
    const row = buildAuditRow({
      kind: 'update',
      options: { type: 'user', ignore: ['preferred_language'] },
      entityId: 'u-1',
      before: { id: 'u-1', full_name: 'A', preferred_language: 'id', assigned_location_ids: ['x'] },
      after: { id: 'u-1', full_name: 'A', preferred_language: 'en', assigned_location_ids: ['y'] },
      relations: new Set(),
      columns: new Set(['id', 'full_name', 'preferred_language']),
      store: {},
    });
    expect(row).toBeNull(); // only an ignored column and a virtual field changed
  });
});
