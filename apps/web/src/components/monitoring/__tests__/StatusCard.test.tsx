/**
 * Unit Tests: StatusCard Component
 * Tests rendering for each status type, color classes, onClick handler,
 * aria-pressed state, and accessible label.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StatusCard } from '../StatusCard';
import type { TrackingStatus } from '@/lib/api/monitoring';

const defaultProps = {
  label: 'Aktif',
  count: 5,
  status: 'active' as TrackingStatus,
  isActive: false,
  onClick: jest.fn(),
};

describe('StatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the label text', () => {
      render(<StatusCard {...defaultProps} />);
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('should render the count value', () => {
      render(<StatusCard {...defaultProps} count={12} />);
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<StatusCard {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render accessible aria-label with count and label', () => {
      render(<StatusCard {...defaultProps} label="Aktif" count={5} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label', 'Saring Aktif: 5 petugas');
    });
  });

  describe('Status-specific styles', () => {
    it.each<[TrackingStatus, string]>([
      ['active', 'bg-[var(--color-status-active-bg)]'],
      ['offline', 'bg-[var(--color-status-idle-bg)]'],
      ['absent', 'bg-[var(--color-status-missing-bg)]'],
    ])('should apply the resting background class for status "%s"', (status, expectedClass) => {
      render(<StatusCard {...defaultProps} status={status} isActive={false} />);
      expect(screen.getByRole('button')).toHaveClass(expectedClass);
    });

    it.each<[TrackingStatus, string]>([
      ['active', 'bg-[var(--color-status-active)]'],
      ['offline', 'bg-[var(--color-status-idle)]'],
      ['absent', 'bg-[var(--color-status-missing)]'],
    ])(
      'should apply active background class for status "%s" when isActive is true',
      (status, expectedClass) => {
        render(<StatusCard {...defaultProps} status={status} isActive={true} />);
        expect(screen.getByRole('button')).toHaveClass(expectedClass);
      }
    );

    it.each<[TrackingStatus, string]>([
      ['active', 'bg-[var(--color-status-active)]'],
      ['offline', 'bg-[var(--color-status-idle)]'],
      ['absent', 'bg-[var(--color-status-missing)]'],
      ['offline', 'bg-[var(--color-status-idle)]'],
    ])(
      'should render status dot with correct color for status "%s"',
      (status, expectedDotClass) => {
        const { container } = render(<StatusCard {...defaultProps} status={status} />);
        const dot = container.querySelector('.rounded-full.flex-shrink-0');
        expect(dot).toHaveClass(expectedDotClass);
      }
    );
  });

  describe('Active/Inactive state', () => {
    it('should set aria-pressed to false when isActive is false', () => {
      render(<StatusCard {...defaultProps} isActive={false} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should set aria-pressed to true when isActive is true', () => {
      render(<StatusCard {...defaultProps} isActive={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Interaction', () => {
    it('should call onClick when the button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<StatusCard {...defaultProps} onClick={handleClick} />);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when activated via keyboard Enter', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<StatusCard {...defaultProps} onClick={handleClick} />);

      screen.getByRole('button').focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when activated via keyboard Space', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<StatusCard {...defaultProps} onClick={handleClick} />);

      screen.getByRole('button').focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Zero count', () => {
    it('should display 0 as count without error', () => {
      render(<StatusCard {...defaultProps} count={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
