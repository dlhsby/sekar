/**
 * Unit Tests: MonitoringStatusBar Component
 * Tests the activity status summary with three-state model (Aktif/Idle/Tidak terdeteksi)
 */

import { render, screen } from '@testing-library/react';
import { MonitoringStatusBar } from '../MonitoringStatusBar';
import '@testing-library/jest-dom';

describe('MonitoringStatusBar', () => {
  it('should render all three primary status chips', () => {
    const totals = {
      total_active: 5,
      total_inactive: 2,
      total_outside_area: 1,
      total_missing: 0,
      total_offline: 2,
    };

    render(<MonitoringStatusBar totals={totals} />);

    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Tidak aktif')).toBeInTheDocument();
    expect(screen.getByText('Tidak terdeteksi')).toBeInTheDocument();
  });

  it('should fold outside_area into Aktif count', () => {
    const totals = {
      total_active: 5,
      total_inactive: 2,
      total_outside_area: 1,
      total_missing: 0,
      total_offline: 2,
    };

    render(<MonitoringStatusBar totals={totals} />);

    // Aktif = total_active + total_outside_area = 5 + 1 = 6
    const chips = screen.getAllByText(/[0-9]+/);
    expect(chips[0]).toHaveTextContent('6'); // Aktif count
  });

  it('should display secondary stats when values are non-zero', () => {
    const totals = {
      total_active: 5,
      total_inactive: 2,
      total_outside_area: 1,
      total_missing: 0,
      total_offline: 2,
    };

    render(<MonitoringStatusBar totals={totals} />);

    expect(screen.getByText(/di luar area/i)).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('should hide secondary stats when all zero', () => {
    const totals = {
      total_active: 5,
      total_inactive: 2,
      total_outside_area: 0,
      total_missing: 0,
      total_offline: 0,
    };

    render(<MonitoringStatusBar totals={totals} />);

    // Primary chips visible
    expect(screen.getByText('Aktif')).toBeInTheDocument();

    // Secondary stats hidden
    expect(screen.queryByText(/di luar area/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('should render skeleton when totals is null', () => {
    const { container } = render(<MonitoringStatusBar totals={null} />);

    // Skeleton placeholders should render when totals is null.
    expect(container.querySelector('[class*="rounded-nb-base"]')).toBeInTheDocument();
  });

  it('should have aria-live region for accessibility', () => {
    const totals = {
      total_active: 5,
      total_inactive: 2,
      total_outside_area: 1,
      total_missing: 0,
      total_offline: 2,
    };

    const { container } = render(<MonitoringStatusBar totals={totals} />);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('role', 'region');
  });

  it('should display all primary chip counts correctly', () => {
    const totals = {
      total_active: 10,
      total_inactive: 5,
      total_outside_area: 2,
      total_missing: 1,
      total_offline: 3,
    };

    render(<MonitoringStatusBar totals={totals} />);

    // Aktif = 10 + 2 = 12
    // Idle = 5
    // Tidak terdeteksi = 1
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Idle
    expect(screen.getByText('1')).toBeInTheDocument(); // Tidak terdeteksi
  });

  it('should handle edge case of all workers missing', () => {
    const totals = {
      total_active: 0,
      total_inactive: 0,
      total_outside_area: 0,
      total_missing: 20,
      total_offline: 0,
    };

    render(<MonitoringStatusBar totals={totals} />);

    expect(screen.getByText('Tidak terdeteksi')).toBeInTheDocument();
    // Tidak terdeteksi count should be 20
    const allText = screen.getAllByText('20');
    expect(allText.length).toBeGreaterThan(0);
  });
});
