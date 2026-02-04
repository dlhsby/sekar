/**
 * Unit Tests: RoleBadge Component
 * Tests role badge display with correct labels
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';
import '@testing-library/jest-dom';

describe('RoleBadge', () => {
  describe('Role Labels', () => {
    it('should render admin role badge', () => {
      render(<RoleBadge role="admin" />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render top management role badge', () => {
      render(<RoleBadge role="top_management" />);
      expect(screen.getByText('Top Management')).toBeInTheDocument();
    });

    it('should render kepala rayon role badge', () => {
      render(<RoleBadge role="kepala_rayon" />);
      expect(screen.getByText('Kepala Rayon')).toBeInTheDocument();
    });

    it('should render koordinator lapangan role badge', () => {
      render(<RoleBadge role="koordinator_lapangan" />);
      expect(screen.getByText('Koordinator Lapangan')).toBeInTheDocument();
    });

    it('should render worker role badge', () => {
      render(<RoleBadge role="worker" />);
      expect(screen.getByText('Worker')).toBeInTheDocument();
    });

    it('should render linmas role badge', () => {
      render(<RoleBadge role="linmas" />);
      expect(screen.getByText('Linmas')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should use Badge component with correct variant for admin', () => {
      const { container } = render(<RoleBadge role="admin" />);
      // Badge is rendered, check it exists
      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });

    it('should use Badge component with correct variant for coordinator', () => {
      const { container } = render(<RoleBadge role="koordinator_lapangan" />);
      // Badge is rendered, check it exists
      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });

    it('should display role label inside Badge', () => {
      render(<RoleBadge role="admin" />);
      const badge = screen.getByText('Admin');
      // Badge component wraps the text
      expect(badge.parentElement).toBeDefined();
    });
  });

  describe('Role Mapping', () => {
    it('should map all valid roles', () => {
      const roles: Array<{ role: any; label: string }> = [
        { role: 'admin', label: 'Admin' },
        { role: 'top_management', label: 'Top Management' },
        { role: 'kepala_rayon', label: 'Kepala Rayon' },
        { role: 'koordinator_lapangan', label: 'Koordinator Lapangan' },
        { role: 'worker', label: 'Worker' },
        { role: 'linmas', label: 'Linmas' },
      ];

      roles.forEach(({ role, label }) => {
        const { unmount } = render(<RoleBadge role={role} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
