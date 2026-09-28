/**
 * Unit Tests: AuditEntryDetail (ADR-061)
 * The detail must show what changed without ever leaking a secret or dumping
 * an oversized blob, and must say who (or "Sistem") and why.
 */

import { render, screen } from '@testing-library/react';
import { AuditEntryDetail } from '../AuditEntryDetail';
import type { AuditEntry } from '@/lib/api/audit';

const base: AuditEntry = {
  id: 'a1',
  seq: '7',
  created_at: '2026-09-28T01:02:03.000Z',
  entity_type: 'district',
  entity_id: 'd1',
  entity_label: 'Rayon Timur',
  action: 'update',
  outcome: 'success',
  source: 'api',
  actor_id: 'u1',
  actor_role: 'management',
  actor_name: 'Management Satu',
  changes: null,
  old_value: null,
  new_value: null,
  metadata: null,
  reason: null,
  ip: '10.0.0.1',
  user_agent: 'jest',
  request_id: 'req-1',
  parent_id: null,
  hash: 'abc',
};

describe('AuditEntryDetail', () => {
  it('shows a before/after row per changed field', () => {
    render(<AuditEntryDetail entry={{ ...base, changes: { name: ['Rayon Timur', 'Rayon Timur Raya'] } }} />);
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Rayon Timur')).toBeInTheDocument();
    expect(screen.getByText('Rayon Timur Raya')).toBeInTheDocument();
    expect(screen.getByText('Diubah')).toBeInTheDocument();
  });

  it('never shows a redacted secret, only that it changed', () => {
    render(
      <AuditEntryDetail
        entry={{ ...base, entity_type: 'user', changes: { password_hash: ['[REDACTED]', '[REDACTED]'] } }}
      />,
    );
    expect(screen.queryByText('[REDACTED]')).not.toBeInTheDocument();
    expect(screen.getAllByText('(disembunyikan)')).toHaveLength(2);
  });

  it('labels an omitted oversized value with its size', () => {
    render(
      <AuditEntryDetail
        entry={{ ...base, changes: { boundary_polygon: [{ _omitted: true, bytes: 9000 }, null] } }}
      />,
    );
    expect(screen.getByText('(terlalu besar, 9000 byte)')).toBeInTheDocument();
    expect(screen.getByText('(kosong)')).toBeInTheDocument();
  });

  it('shows the operator reason of a force delete', () => {
    render(<AuditEntryDetail entry={{ ...base, action: 'force_delete', reason: 'Lokasi ditutup permanen' }} />);
    expect(screen.getByText('Hapus paksa')).toBeInTheDocument();
    expect(screen.getByText('Lokasi ditutup permanen')).toBeInTheDocument();
  });

  it('attributes actor-less entries to the system', () => {
    render(<AuditEntryDetail entry={{ ...base, actor_id: null, actor_name: null, actor_role: null, source: 'system' }} />);
    expect(screen.getByText(/Sistem/)).toBeInTheDocument();
  });

  it('falls back to the raw verb for an action it does not know', () => {
    render(<AuditEntryDetail entry={{ ...base, action: 'verify' }} />);
    expect(screen.getByText('verify')).toBeInTheDocument();
  });
});
