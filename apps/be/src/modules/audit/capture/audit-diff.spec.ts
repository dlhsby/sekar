import { diffSnapshots, snapshotOf, MAX_FIELD_BYTES, REDACTED } from './audit-diff';

describe('audit-diff', () => {
  describe('snapshotOf', () => {
    it('keeps plain columns and serialises dates to ISO strings', () => {
      const at = new Date('2026-09-26T01:02:03.000Z');
      expect(snapshotOf({ name: 'Rayon Timur', is_active: true, created_on: at }, [])).toEqual({
        name: 'Rayon Timur',
        is_active: true,
        created_on: '2026-09-26T01:02:03.000Z',
      });
    });

    it('always redacts secrets, plus any entity-specific fields', () => {
      const snap = snapshotOf(
        { username: 'budi', password_hash: '$2b$10$x', refresh_token: 't', phone_number: '0812' },
        ['phone_number'],
      );
      expect(snap).toEqual({
        username: 'budi',
        password_hash: REDACTED,
        refresh_token: REDACTED,
        phone_number: REDACTED,
      });
    });

    it('drops bookkeeping columns that carry no business meaning', () => {
      const snap = snapshotOf(
        {
          name: 'A',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'u',
          updated_by: 'u',
        },
        [],
      );
      expect(snap).toEqual({ name: 'A' });
    });

    it('replaces oversized values with a size marker instead of storing them', () => {
      const big = 'x'.repeat(MAX_FIELD_BYTES + 1);
      expect(snapshotOf({ boundary_polygon: big }, []).boundary_polygon).toEqual({
        _omitted: true,
        bytes: MAX_FIELD_BYTES + 3, // JSON-encoded length includes the quotes
      });
    });

    it('skips relation objects/arrays of entities but keeps plain JSON', () => {
      const snap = snapshotOf(
        { district: { id: 'd1', name: 'X' }, tags: ['a', 'b'], marker: { icon: 'leaf' } },
        [],
        new Set(['district']),
      );
      expect(snap).toEqual({ tags: ['a', 'b'], marker: { icon: 'leaf' } });
    });

    it('does not mutate its input', () => {
      const input = { name: 'A', password_hash: 'secret' };
      snapshotOf(input, []);
      expect(input).toEqual({ name: 'A', password_hash: 'secret' });
    });
  });

  describe('diffSnapshots', () => {
    it('returns only changed fields as [old, new]', () => {
      expect(
        diffSnapshots(
          { name: 'A', is_active: true, color: '#111111' },
          { name: 'B', is_active: true, color: '#111111' },
        ),
      ).toEqual({ name: ['A', 'B'] });
    });

    it('treats null and undefined as the same value', () => {
      expect(diffSnapshots({ note: null }, { note: undefined })).toEqual({});
    });

    it('compares nested JSON structurally, not by reference', () => {
      expect(diffSnapshots({ tags: ['a'] }, { tags: ['a'] })).toEqual({});
      expect(diffSnapshots({ tags: ['a'] }, { tags: ['a', 'b'] })).toEqual({
        tags: [['a'], ['a', 'b']],
      });
    });

    it('reports added and removed keys', () => {
      expect(diffSnapshots({ a: 1 }, { b: 2 })).toEqual({ a: [1, null], b: [null, 2] });
    });

    it('never reveals a redacted value, only that it changed', () => {
      expect(
        diffSnapshots({ password_hash: REDACTED }, { password_hash: REDACTED }, ['password_hash']),
      ).toEqual({
        password_hash: [REDACTED, REDACTED],
      });
    });
  });
});
