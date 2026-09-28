/**
 * Unit Tests: Audit log page (ADR-061)
 * Gated by audit:read; filters reach the server query; the integrity check
 * reports a broken chain loudly; a row opens its full detail.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuditLogPage from '../page';
import type { AuditEntry } from '@/lib/api/audit';

const mockCan = jest.fn();
jest.mock('@/lib/auth/usePermissions', () => ({
  usePermissions: () => ({ can: mockCan }),
}));

const mockUseAuditLogs = jest.fn();
const mockVerify = jest.fn();
jest.mock('@/lib/api/audit', () => ({
  ...jest.requireActual('@/lib/api/audit'),
  useAuditLogs: (...args: unknown[]) => mockUseAuditLogs(...args),
  useAuditTypes: () => ({ data: ['district', 'user'] }),
  useAuditVerify: (enabled: boolean) => mockVerify(enabled),
  downloadAuditCsv: jest.fn().mockResolvedValue({ truncated: false }),
}));
jest.mock('@/lib/api/roles', () => ({
  useRoles: () => ({ data: [{ code: 'management', name: 'Management' }] }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

const entry: AuditEntry = {
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
  changes: { name: ['Rayon Timur', 'Rayon Timur Raya'] },
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

describe('AuditLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockUseAuditLogs.mockReturnValue({
      data: { data: [entry], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockVerify.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: jest.fn() });
  });

  it('refuses without audit:read', () => {
    mockCan.mockReturnValue(false);
    render(<AuditLogPage />);
    expect(screen.getByText(/tidak memiliki izin untuk melihat log audit/i)).toBeInTheDocument();
    expect(mockUseAuditLogs).not.toHaveBeenCalledWith(expect.anything(), 2, 50);
  });

  it('lists who did what to which record', () => {
    render(<AuditLogPage />);
    expect(screen.getAllByText('Management Satu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rayon Timur').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 kolom berubah').length).toBeGreaterThan(0);
  });

  it('sends the search text to the server query (debounced) and restarts at page 1', async () => {
    render(<AuditLogPage />);
    fireEvent.change(screen.getByPlaceholderText(/Cari nama data atau pelaku/), {
      target: { value: 'Timur' },
    });
    await waitFor(() =>
      expect(mockUseAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Timur' }), 1, 50),
    );
  });

  it('reports a broken hash chain loudly', () => {
    mockVerify.mockReturnValue({
      data: { sealed: 3, unsealed: 0, first_broken_seq: '2', last_hash: null, intact: false },
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<AuditLogPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/RUSAK .* #2/);
  });

  it('opens the full detail with the field diff when a row is clicked', () => {
    render(<AuditLogPage />);
    fireEvent.click(screen.getAllByText('Rayon Timur')[0]);
    expect(screen.getByText('Detail audit')).toBeInTheDocument();
    expect(screen.getAllByText('Rayon Timur Raya').length).toBeGreaterThan(0);
  });
});
