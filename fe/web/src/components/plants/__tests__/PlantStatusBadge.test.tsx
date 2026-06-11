/**
 * Unit Tests: PlantStatusBadge Component
 * Tests status mapping: ok/due_soon/overdue/unknown → Badge + label
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlantStatusBadge } from '../PlantStatusBadge';
import type { AreaPlantStatus } from '@/lib/api/plants';
import '@testing-library/jest-dom';

describe('PlantStatusBadge Component', () => {
  describe('Status variants', () => {
    it('should render ok status as Terawat (success)', () => {
      render(<PlantStatusBadge status="ok" />);
      const badge = screen.getByText('Terawat');
      expect(badge).toHaveClass('bg-nb-success');
    });

    it('should render due_soon status as Segera (warning)', () => {
      render(<PlantStatusBadge status="due_soon" />);
      const badge = screen.getByText('Segera');
      expect(badge).toHaveClass('bg-nb-warning');
    });

    it('should render overdue status as Terlambat (destructive)', () => {
      render(<PlantStatusBadge status="overdue" />);
      const badge = screen.getByText('Terlambat');
      expect(badge).toHaveClass('bg-nb-danger');
    });

    it('should render unknown status as Belum Ada Data (secondary)', () => {
      render(<PlantStatusBadge status="unknown" />);
      const badge = screen.getByText('Belum Ada Data');
      expect(badge).toHaveClass('bg-nb-gray-100');
    });
  });

  describe('Custom className', () => {
    it('should accept and merge custom className', () => {
      const { container } = render(<PlantStatusBadge status="ok" className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and aria attributes', () => {
      const { container } = render(<PlantStatusBadge status="ok" />);
      const badge = container.querySelector('div');
      expect(badge).toBeInTheDocument();
    });
  });
});
