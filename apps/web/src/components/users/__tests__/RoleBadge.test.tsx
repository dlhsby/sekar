/**
 * Unit Tests: RoleBadge Component
 * Tests role badge display with correct labels (Phase 2C - 8 roles)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';
import '@testing-library/jest-dom';

describe('RoleBadge', () => {
  describe('Role Labels', () => {
    it('should render satgas role badge', () => {
      render(<RoleBadge role="satgas" />);
      expect(screen.getByText('Satgas')).toBeInTheDocument();
    });

    it('should render linmas role badge', () => {
      render(<RoleBadge role="linmas" />);
      expect(screen.getByText('Linmas')).toBeInTheDocument();
    });

    it('should render korlap role badge', () => {
      render(<RoleBadge role="korlap" />);
      expect(screen.getByText('Korlap')).toBeInTheDocument();
    });

    it('should render admin_rayon role badge', () => {
      render(<RoleBadge role="admin_rayon" />);
      expect(screen.getByText('Admin Rayon')).toBeInTheDocument();
    });

    it('should render kepala_rayon role badge', () => {
      render(<RoleBadge role="kepala_rayon" />);
      expect(screen.getByText('Kepala Rayon')).toBeInTheDocument();
    });

    it('should render management role badge', () => {
      render(<RoleBadge role="management" />);
      expect(screen.getByText('Management')).toBeInTheDocument();
    });

    it('should render admin_system role badge', () => {
      render(<RoleBadge role="admin_system" />);
      expect(screen.getByText('Admin Sistem')).toBeInTheDocument();
    });

    it('should render superadmin role badge', () => {
      render(<RoleBadge role="superadmin" />);
      expect(screen.getByText('Superadmin')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should use Badge component with correct variant for admin_system', () => {
      const { container } = render(<RoleBadge role="admin_system" />);
      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });

    it('should use Badge component with correct variant for korlap', () => {
      const { container } = render(<RoleBadge role="korlap" />);
      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });

    it('should display role label inside Badge', () => {
      render(<RoleBadge role="admin_system" />);
      const badge = screen.getByText('Admin Sistem');
      expect(badge.parentElement).toBeDefined();
    });
  });

  describe('Role Mapping', () => {
    it('should map all valid roles', () => {
      const roles: Array<{ role: any; label: string }> = [
        { role: 'satgas', label: 'Satgas' },
        { role: 'linmas', label: 'Linmas' },
        { role: 'korlap', label: 'Korlap' },
        { role: 'admin_rayon', label: 'Admin Rayon' },
        { role: 'kepala_rayon', label: 'Kepala Rayon' },
        { role: 'management', label: 'Management' },
        { role: 'admin_system', label: 'Admin Sistem' },
        { role: 'superadmin', label: 'Superadmin' },
      ];

      roles.forEach(({ role, label }) => {
        const { unmount } = render(<RoleBadge role={role} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
