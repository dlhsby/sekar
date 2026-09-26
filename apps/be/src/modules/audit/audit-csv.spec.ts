import { csvCell, toAuditCsv } from './audit-csv';
import type { AuditLog } from './entities/audit-log.entity';

describe('audit CSV', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('Taman, Barat')).toBe('"Taman, Barat"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it.each(['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)'])(
    'neutralises formula-looking value %s',
    (v) => {
      expect(csvCell(v).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
    },
  );

  it('serialises objects as JSON and nulls as empty', () => {
    expect(csvCell({ name: ['A', 'B'] })).toBe('"{""name"":[""A"",""B""]}"');
    expect(csvCell(null)).toBe('');
  });

  it('emits a BOM, a header and one line per row', () => {
    const csv = toAuditCsv([
      {
        created_at: new Date('2026-09-26T00:00:00Z'),
        seq: '7',
        actor_name: 'Management Satu',
        action: 'update',
        entity_type: 'district',
        entity_label: 'Rayon Timur',
      } as unknown as AuditLog,
    ]);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0].split(',')[0]).toBe('occurred_at_utc');
    expect(lines[1]).toContain('2026-09-26T00:00:00.000Z,7,Management Satu');
  });
});
