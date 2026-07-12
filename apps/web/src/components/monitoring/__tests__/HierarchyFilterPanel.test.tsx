/**
 * Unit Tests: HierarchyFilterPanel
 * - Renders scope buttons (City, Rayon, Area)
 * - Selecting Rayon scope emits correct filter state
 * - Reset button shown only when scope != city, and resets on click
 * - Active worker count badge is visible
 * - Rayon + area dropdowns appear in correct scope
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  HierarchyFilterPanel,
  type HierarchyFilterState,
} from '../HierarchyFilterPanel';

// ---------------------------------------------------------------------------
// Mock cascading data hooks
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(() => ({
    data: [
      { id: 'r1', name: 'Rayon Utara', code: 'RU' },
      { id: 'r2', name: 'Rayon Selatan', code: 'RS' },
    ],
  })),
}));

jest.mock('@/lib/api/locations', () => ({
  useLocations: jest.fn(() => ({
    data: {
      data: [
        { id: 'a1', name: 'Area Bungkul', rayon_id: 'r1' },
        { id: 'a2', name: 'Area Wonokromo', rayon_id: 'r1' },
      ],
    },
  })),
}));

// ---------------------------------------------------------------------------
// Controlled wrapper so we can observe state changes
// ---------------------------------------------------------------------------

function Wrapper({ initial }: { initial?: HierarchyFilterState }) {
  const [value, setValue] = useState<HierarchyFilterState>(initial ?? { scope: 'city' });
  return (
    <HierarchyFilterPanel
      value={value}
      onChange={setValue}
      activeWorkerCount={5}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HierarchyFilterPanel', () => {
  it('renders all three scope buttons', () => {
    render(<Wrapper />);
    expect(screen.getByRole('button', { name: /^Kota$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rayon$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Area$/i })).toBeInTheDocument();
  });

  it('defaults Kota button as pressed', () => {
    render(<Wrapper />);
    expect(screen.getByRole('button', { name: /^Kota$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Rayon$/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('shows active worker count badge', () => {
    render(<Wrapper />);
    expect(screen.getByText(/5 aktif/i)).toBeInTheDocument();
  });

  it('does not show Reset button when scope is city', () => {
    render(<Wrapper />);
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('switches to Rayon scope and shows rayon dropdown on Rayon click', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: /^Rayon$/i }));
    expect(screen.getByRole('button', { name: /^Rayon$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Rayon dropdown appears
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows Reset button when scope is rayon', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: /^Rayon$/i }));
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('clicking Reset returns scope to city and hides Reset', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: /^Rayon$/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^Kota$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows two dropdowns (rayon + area) in Area scope', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: /^Area$/i }));
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders with a pre-set rayon scope correctly', () => {
    render(<Wrapper initial={{ scope: 'rayon', rayonId: 'r1' }} />);
    expect(screen.getByRole('button', { name: /^Rayon$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('the filter region has accessible label', () => {
    render(<Wrapper />);
    expect(screen.getByRole('search', { name: /filter monitoring/i })).toBeInTheDocument();
  });
});
