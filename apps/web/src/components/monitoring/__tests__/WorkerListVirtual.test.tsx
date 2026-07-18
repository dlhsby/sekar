/**
 * Unit Tests: WorkerListVirtual
 * - Renders correct number of rows visible in viewport
 * - Shows empty state when workers array is empty
 * - Calls onSelect with correct user_id on click
 * - Highlights the selected worker
 *
 * Note: @tanstack/react-virtual uses DOM layout APIs that jsdom does not
 * implement (scrollTop, offsetHeight).  We mock useVirtualizer so that all
 * items are returned as virtual rows, enabling full rendering in jsdom.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WorkerListVirtual, type WorkerListItem } from '../WorkerListVirtual';

// ---------------------------------------------------------------------------
// Mock useVirtualizer — returns every item as a "virtual" row at sequential
// positions so jsdom renders all of them.
// ---------------------------------------------------------------------------
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
    const itemHeight = estimateSize();
    const items = Array.from({ length: count }, (_, i) => ({
      index: i,
      start: i * itemHeight,
      size: itemHeight,
      key: i,
      lane: 0,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * itemHeight,
    };
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkers(count: number): WorkerListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    user_id: `user-${i}`,
    full_name: `Petugas ${i}`,
    role: 'satgas',
    status: 'active' as const,
    location_id: `area-${i % 3}`,
    location_name: `Area ${i % 3}`,
    last_update: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkerListVirtual', () => {
  it('renders empty state when workers array is empty', () => {
    render(
      <WorkerListVirtual
        workers={[]}
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText('Tidak ada petugas aktif')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders at least one visible row for a non-empty workers array', () => {
    const workers = makeWorkers(5);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
      />
    );
    // The virtualizer renders overscan items; expect at least 1 row button
    const rows = screen.getAllByRole('button');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('renders correct total row count when workers fit in viewport', () => {
    // With 3 workers at 72px each (216px total < 560px max), all should render
    const workers = makeWorkers(3);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
      />
    );
    const rows = screen.getAllByRole('button');
    expect(rows.length).toBe(3);
  });

  it('displays worker name and area name in each row', () => {
    const workers = makeWorkers(2);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText('Petugas 0')).toBeInTheDocument();
    expect(screen.getByText('Petugas 1')).toBeInTheDocument();
  });

  it('calls onSelect with the correct user_id when a row is clicked', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    const workers = makeWorkers(3);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={onSelect}
      />
    );
    const rows = screen.getAllByRole('button');
    await user.click(rows[0]);
    expect(onSelect).toHaveBeenCalledWith('user-0');
  });

  it('calls onSelect via Enter keydown', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    const workers = makeWorkers(2);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={onSelect}
      />
    );
    const rows = screen.getAllByRole('button');
    rows[1].focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('user-1');
  });

  it('marks the selected worker row with aria-pressed=true', () => {
    const workers = makeWorkers(3);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
        selectedUserId="user-1"
      />
    );
    const rows = screen.getAllByRole('button');
    const selectedRow = rows.find((r) => r.getAttribute('aria-pressed') === 'true');
    expect(selectedRow).toBeDefined();
    expect(within(selectedRow!).getByText('Petugas 1')).toBeInTheDocument();
  });

  it('shows the list with an accessible label', () => {
    const workers = makeWorkers(1);
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
        aria-label="Custom worker list"
      />
    );
    expect(screen.getByRole('list', { name: 'Custom worker list' })).toBeInTheDocument();
  });

  it('displays status badge text for each visible row', () => {
    const workers: WorkerListItem[] = [
      {
        user_id: 'w1',
        full_name: 'Caca',
        role: 'satgas',
        status: 'absent',
        location_id: 'area-1',
        location_name: 'Taman A',
        last_update: new Date().toISOString(),
      },
    ];
    render(
      <WorkerListVirtual
        workers={workers}
        onSelect={jest.fn()}
      />
    );
    // 'Tidak Terdeteksi' was the label for the retired `missing` status. `absent`
    // means "never clocked in" — tidak hadir — which is a different claim.
    expect(screen.getByText('Tidak Hadir')).toBeInTheDocument();
  });
});
