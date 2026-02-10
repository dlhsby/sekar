/**
 * Unit Tests: EmptyState Component
 * Tests empty state variants, icons, actions, and user interactions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../empty-state';
import { Inbox, SearchX, AlertCircle } from 'lucide-react';
import '@testing-library/jest-dom';

describe('EmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('should render empty state', () => {
      render(<EmptyState />);

      expect(screen.getByText('Belum Ada Data')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<EmptyState variant="noData" />);

      expect(screen.getByText('Belum Ada Data')).toBeInTheDocument();
      expect(
        screen.getByText('Data akan muncul di sini setelah Anda menambahkannya.')
      ).toBeInTheDocument();
    });

    it('should render icon container', () => {
      const { container } = render(<EmptyState />);

      const iconContainer = container.querySelector('.w-16.h-16');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render with border and shadow', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('border-3', 'border-nb-black', 'shadow-nb-sm');
    });
  });

  describe('Variants', () => {
    it('should render noData variant', () => {
      render(<EmptyState variant="noData" />);

      expect(screen.getByText('Belum Ada Data')).toBeInTheDocument();
      expect(screen.getByText(/Data akan muncul di sini/)).toBeInTheDocument();
    });

    it('should render noResults variant', () => {
      render(<EmptyState variant="noResults" />);

      expect(screen.getByText('Tidak Ditemukan')).toBeInTheDocument();
      expect(screen.getByText(/Tidak ada hasil yang cocok/)).toBeInTheDocument();
    });

    it('should render offline variant', () => {
      render(<EmptyState variant="offline" />);

      expect(screen.getByText('Tidak Ada Koneksi')).toBeInTheDocument();
      expect(screen.getByText(/Periksa koneksi internet/)).toBeInTheDocument();
    });

    it('should render error variant', () => {
      render(<EmptyState variant="error" />);

      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
      expect(screen.getByText(/Terjadi kesalahan saat memuat data/)).toBeInTheDocument();
    });

    it('should render maintenance variant', () => {
      render(<EmptyState variant="maintenance" />);

      expect(screen.getByText('Dalam Perbaikan')).toBeInTheDocument();
      expect(screen.getByText(/Fitur ini sedang dalam perbaikan/)).toBeInTheDocument();
    });

    it('should render noPermission variant', () => {
      render(<EmptyState variant="noPermission" />);

      expect(screen.getByText('Tidak Memiliki Akses')).toBeInTheDocument();
      expect(screen.getByText(/Anda tidak memiliki izin/)).toBeInTheDocument();
    });

    it('should render emptyFolder variant', () => {
      render(<EmptyState variant="emptyFolder" />);

      expect(screen.getByText('Folder Kosong')).toBeInTheDocument();
      expect(screen.getByText(/Folder ini belum memiliki konten/)).toBeInTheDocument();
    });

    it('should render allDone variant', () => {
      render(<EmptyState variant="allDone" />);

      expect(screen.getByText('Semua Selesai')).toBeInTheDocument();
      expect(screen.getByText(/Tidak ada tugas yang perlu dikerjakan/)).toBeInTheDocument();
    });

    it('should render search variant', () => {
      render(<EmptyState variant="search" />);

      expect(screen.getByText('Mulai Pencarian')).toBeInTheDocument();
      expect(screen.getByText(/Ketik kata kunci untuk mencari data/)).toBeInTheDocument();
    });
  });

  describe('Custom Content', () => {
    it('should render custom title', () => {
      render(<EmptyState title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render custom description', () => {
      render(<EmptyState description="Custom description text" />);

      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('should override variant title with custom title', () => {
      render(<EmptyState variant="error" title="My Custom Error" />);

      expect(screen.getByText('My Custom Error')).toBeInTheDocument();
      expect(screen.queryByText('Terjadi Kesalahan')).not.toBeInTheDocument();
    });

    it('should override variant description with custom description', () => {
      render(<EmptyState variant="error" description="Something went wrong. Please try again." />);

      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('should use custom icon', () => {
      const { container } = render(<EmptyState icon={AlertCircle} title="Custom Icon" />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Icon Colors', () => {
    it('should apply gray color to default variants', () => {
      const { container } = render(<EmptyState variant="noData" />);

      const iconContainer = container.querySelector('.text-nb-gray-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply danger color to error variant', () => {
      const { container } = render(<EmptyState variant="error" />);

      const iconContainer = container.querySelector('.text-nb-danger');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply success color to allDone variant', () => {
      const { container } = render(<EmptyState variant="allDone" />);

      const iconContainer = container.querySelector('.text-nb-success');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply warning color to offline variant', () => {
      const { container } = render(<EmptyState variant="offline" />);

      const iconContainer = container.querySelector('.text-nb-warning');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply warning color to maintenance variant', () => {
      const { container } = render(<EmptyState variant="maintenance" />);

      const iconContainer = container.querySelector('.text-nb-warning');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render primary action button', () => {
      const handleAction = jest.fn();
      render(
        <EmptyState
          action={{
            label: 'Add Item',
            onClick: handleAction,
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('should call onClick when action button clicked', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          action={{
            label: 'Add Item',
            onClick: handleAction,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Add Item' }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should render action button with custom variant', () => {
      render(
        <EmptyState
          action={{
            label: 'Retry',
            onClick: jest.fn(),
            variant: 'destructive',
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Retry' });
      expect(button).toHaveClass('bg-nb-danger');
    });

    it('should render secondary action button', () => {
      render(
        <EmptyState
          secondaryAction={{
            label: 'Cancel',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should call onClick when secondary button clicked', async () => {
      const user = userEvent.setup();
      const handleSecondary = jest.fn();

      render(
        <EmptyState
          secondaryAction={{
            label: 'Cancel',
            onClick: handleSecondary,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    it('should render both primary and secondary actions', () => {
      render(
        <EmptyState
          action={{
            label: 'Add Item',
            onClick: jest.fn(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should not render action section when no actions provided', () => {
      const { container } = render(<EmptyState />);

      const actionButtons = container.querySelectorAll('button');
      expect(actionButtons.length).toBe(0);
    });

    it('should style secondary action as outline', () => {
      render(
        <EmptyState
          secondaryAction={{
            label: 'Cancel',
            onClick: jest.fn(),
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Cancel' });
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('should render with default size', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('py-8', 'px-6');
    });

    it('should render with small size', () => {
      const { container } = render(<EmptyState size="sm" />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('py-6', 'px-4');
    });

    it('should render with large size', () => {
      const { container } = render(<EmptyState size="lg" />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('py-12', 'px-8');
    });
  });

  describe('Layout', () => {
    it('should center content', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'text-center'
      );
    });

    it('should have proper spacing between elements', () => {
      const { container } = render(<EmptyState />);

      const iconContainer = container.querySelector('.mb-4');
      expect(iconContainer).toBeInTheDocument();

      const title = screen.getByText('Belum Ada Data');
      expect(title).toHaveClass('mb-2');

      const description = screen.getByText(/Data akan muncul di sini/);
      expect(description).toHaveClass('mb-6');
    });

    it('should limit description width', () => {
      render(<EmptyState />);

      const description = screen.getByText(/Data akan muncul di sini/);
      expect(description).toHaveClass('max-w-md');
    });

    it('should wrap action buttons', () => {
      const { container } = render(
        <EmptyState
          action={{ label: 'Action', onClick: jest.fn() }}
          secondaryAction={{ label: 'Secondary', onClick: jest.fn() }}
        />
      );

      const actionContainer = container.querySelector('.flex.flex-wrap');
      expect(actionContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EmptyState />);

      const heading = screen.getByRole('heading', { name: 'Belum Ada Data' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should have descriptive text', () => {
      render(<EmptyState variant="error" />);

      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
      expect(screen.getByText(/Terjadi kesalahan saat memuat data/)).toBeInTheDocument();
    });

    it('should have keyboard accessible action buttons', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          action={{
            label: 'Add Item',
            onClick: handleAction,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Add Item' });
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should have proper icon aria attributes', () => {
      const { container } = render(<EmptyState />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have 3px border', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('border-3', 'border-nb-black');
    });

    it('should have hard shadow', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('shadow-nb-sm');
    });

    it('should have border on icon container', () => {
      const { container } = render(<EmptyState />);

      const iconContainer = container.querySelector('.w-16.h-16');
      expect(iconContainer).toHaveClass('border-3', 'border-nb-black', 'shadow-nb-sm');
    });

    it('should have white background', () => {
      const { container } = render(<EmptyState />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('bg-nb-white');
    });

    it('should have gray background on icon container', () => {
      const { container } = render(<EmptyState />);

      const iconContainer = container.querySelector('.w-16.h-16');
      expect(iconContainer).toHaveClass('bg-nb-gray-100');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<EmptyState className="custom-empty-state" />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('custom-empty-state');
    });

    it('should merge custom className with variant classes', () => {
      const { container } = render(<EmptyState className="my-8" />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('my-8', 'border-3', 'border-nb-black');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<EmptyState ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should accept data attributes', () => {
      const { container } = render(<EmptyState data-testid="empty-state-test" />);

      expect(container.querySelector('[data-testid="empty-state-test"]')).toBeInTheDocument();
    });
  });

  describe('Real World Scenarios', () => {
    it('should render empty user list state', () => {
      render(
        <EmptyState
          variant="noData"
          title="Belum Ada Pengguna"
          description="Tambahkan pengguna pertama Anda untuk memulai"
          action={{
            label: 'Tambah Pengguna',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByText('Belum Ada Pengguna')).toBeInTheDocument();
      expect(screen.getByText(/Tambahkan pengguna pertama/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tambah Pengguna' })).toBeInTheDocument();
    });

    it('should render search no results state', () => {
      render(
        <EmptyState
          variant="noResults"
          description='Tidak ada hasil untuk "john doe"'
          action={{
            label: 'Clear Search',
            onClick: jest.fn(),
            variant: 'outline',
          }}
        />
      );

      expect(screen.getByText('Tidak Ditemukan')).toBeInTheDocument();
      expect(screen.getByText(/Tidak ada hasil untuk/)).toBeInTheDocument();
    });

    it('should render error state with retry action', () => {
      const handleRetry = jest.fn();
      render(
        <EmptyState
          variant="error"
          action={{
            label: 'Coba Lagi',
            onClick: handleRetry,
          }}
        />
      );

      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
    });

    it('should render offline state', () => {
      render(
        <EmptyState
          variant="offline"
          action={{
            label: 'Refresh',
            onClick: jest.fn(),
          }}
        />
      );

      expect(screen.getByText('Tidak Ada Koneksi')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });

    it('should render all done state', () => {
      render(
        <EmptyState
          variant="allDone"
          title="Semua Tugas Selesai!"
          description="Anda telah menyelesaikan semua tugas hari ini"
        />
      );

      expect(screen.getByText('Semua Tugas Selesai!')).toBeInTheDocument();
      expect(screen.getByText(/Anda telah menyelesaikan/)).toBeInTheDocument();
    });
  });

  describe('Multiple Actions Interaction', () => {
    it('should handle both actions independently', async () => {
      const user = userEvent.setup();
      const handlePrimary = jest.fn();
      const handleSecondary = jest.fn();

      render(
        <EmptyState
          action={{
            label: 'Primary',
            onClick: handlePrimary,
          }}
          secondaryAction={{
            label: 'Secondary',
            onClick: handleSecondary,
          }}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Primary' }));
      expect(handlePrimary).toHaveBeenCalledTimes(1);
      expect(handleSecondary).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Secondary' }));
      expect(handleSecondary).toHaveBeenCalledTimes(1);
      expect(handlePrimary).toHaveBeenCalledTimes(1);
    });

    it('should allow clicking actions multiple times', async () => {
      const user = userEvent.setup();
      const handleAction = jest.fn();

      render(
        <EmptyState
          action={{
            label: 'Retry',
            onClick: handleAction,
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Retry' });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleAction).toHaveBeenCalledTimes(3);
    });
  });
});
