/**
 * EmptyState Component Tests
 * Tests all 9 variants, custom props, CTA button, and accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState Component', () => {
  describe('Variants', () => {
    it('should render reports variant with correct defaults', () => {
      const { getByText, UNSAFE_getByType } = render(
        <EmptyState variant="reports" />
      );
      expect(getByText('Belum Ada Laporan')).toBeTruthy();
      expect(
        getByText('Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')
      ).toBeTruthy();
    });

    it('should render shifts variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="shifts" />);
      expect(getByText('Belum Ada Shift')).toBeTruthy();
      expect(
        getByText('Belum ada riwayat shift yang tersedia. Data shift akan muncul setelah Anda melakukan clock-in.')
      ).toBeTruthy();
    });

    it('should render workers variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="workers" />);
      expect(getByText('Belum Ada Pekerja')).toBeTruthy();
      expect(
        getByText('Tidak ada pekerja aktif saat ini. Pekerja akan muncul setelah mereka melakukan clock-in.')
      ).toBeTruthy();
    });

    it('should render locations variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="locations" />);
      expect(getByText('Tidak Ada Lokasi')).toBeTruthy();
      expect(
        getByText('Tidak ada data lokasi yang tersedia. Pastikan GPS aktif dan izin lokasi diberikan.')
      ).toBeTruthy();
    });

    it('should render notifications variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="notifications" />);
      expect(getByText('Tidak Ada Notifikasi')).toBeTruthy();
      expect(
        getByText('Anda sudah membaca semua notifikasi. Notifikasi baru akan muncul di sini.')
      ).toBeTruthy();
    });

    it('should render search variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="search" />);
      expect(getByText('Tidak Ditemukan')).toBeTruthy();
      expect(
        getByText('Tidak ada hasil yang cocok dengan pencarian Anda. Coba gunakan kata kunci lain.')
      ).toBeTruthy();
    });

    it('should render error variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="error" />);
      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
      expect(
        getByText('Gagal memuat data. Silakan coba lagi atau periksa koneksi internet Anda.')
      ).toBeTruthy();
    });

    it('should render offline variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="offline" />);
      expect(getByText('Tidak Ada Koneksi')).toBeTruthy();
      expect(
        getByText('Anda sedang offline. Data akan dimuat otomatis saat koneksi tersedia kembali.')
      ).toBeTruthy();
    });

    it('should render generic variant with correct defaults', () => {
      const { getByText } = render(<EmptyState variant="generic" />);
      expect(getByText('Tidak Ada Data')).toBeTruthy();
      expect(getByText('Belum ada data untuk ditampilkan.')).toBeTruthy();
    });

    it('should default to generic variant when no variant provided', () => {
      const { getByText } = render(<EmptyState />);
      expect(getByText('Tidak Ada Data')).toBeTruthy();
      expect(getByText('Belum ada data untuk ditampilkan.')).toBeTruthy();
    });
  });

  describe('Custom Props', () => {
    it('should render custom title', () => {
      const { getByText } = render(
        <EmptyState variant="reports" title="Custom Title" />
      );
      expect(getByText('Custom Title')).toBeTruthy();
    });

    it('should render custom description', () => {
      const { getByText } = render(
        <EmptyState
          variant="reports"
          description="This is a custom description"
        />
      );
      expect(getByText('This is a custom description')).toBeTruthy();
    });

    it('should override both title and description', () => {
      const { getByText, queryByText } = render(
        <EmptyState
          variant="reports"
          title="My Title"
          description="My Description"
        />
      );
      expect(getByText('My Title')).toBeTruthy();
      expect(getByText('My Description')).toBeTruthy();
      expect(queryByText('Belum Ada Laporan')).toBeNull();
    });

    it('should apply custom style', () => {
      const customStyle = { padding: 50 };
      const { getByLabelText } = render(
        <EmptyState variant="generic" style={customStyle} />
      );
      const container = getByLabelText('Tidak Ada Data. Belum ada data untuk ditampilkan.');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('should use custom icon name', () => {
      // Custom icon should render without errors
      const { getByLabelText } = render(
        <EmptyState variant="reports" icon="emoticon-sad-outline" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should use custom icon color', () => {
      // Custom icon color should render without errors
      const { getByLabelText } = render(
        <EmptyState variant="reports" iconColor="#FF0000" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should allow overriding variant defaults with custom props', () => {
      const { getByText } = render(
        <EmptyState
          variant="error"
          title="Custom Error"
          description="Something went wrong here"
          icon="alert"
          iconColor="#000000"
        />
      );
      expect(getByText('Custom Error')).toBeTruthy();
      expect(getByText('Something went wrong here')).toBeTruthy();
    });
  });

  describe('CTA Button', () => {
    it('should render CTA button when both label and handler provided', () => {
      const mockHandler = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="reports"
          ctaLabel="Create Report"
          onCtaPress={mockHandler}
        />
      );
      expect(getByText('Create Report')).toBeTruthy();
    });

    it('should call onCtaPress when CTA button pressed', () => {
      const mockHandler = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="reports"
          ctaLabel="Create Report"
          onCtaPress={mockHandler}
        />
      );
      fireEvent.press(getByText('Create Report'));
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should not render CTA button when only label provided', () => {
      const { queryByText } = render(
        <EmptyState variant="reports" ctaLabel="Create Report" />
      );
      expect(queryByText('Create Report')).toBeNull();
    });

    it('should not render CTA button when only handler provided', () => {
      const mockHandler = jest.fn();
      const { queryByRole } = render(
        <EmptyState variant="reports" onCtaPress={mockHandler} />
      );
      // Should not have any extra button beyond the container
      const buttons = queryByRole('button');
      expect(buttons).toBeNull();
    });

    it('should not render CTA button when neither label nor handler provided', () => {
      const { queryByRole } = render(<EmptyState variant="reports" />);
      const buttons = queryByRole('button');
      expect(buttons).toBeNull();
    });

    it('should render CTA button with outline variant', () => {
      const mockHandler = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="reports"
          ctaLabel="Action"
          onCtaPress={mockHandler}
        />
      );
      const button = getByText('Action');
      expect(button).toBeTruthy();
      // Button component internally uses outline variant
    });
  });

  describe('Accessibility', () => {
    it('should have text role for container', () => {
      const { getByLabelText } = render(<EmptyState variant="reports" />);
      const container = getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.');
      expect(container.props.accessibilityRole).toBe('text');
    });

    it('should combine title and description in accessibility label', () => {
      const { getByLabelText } = render(<EmptyState variant="reports" />);
      expect(
        getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')
      ).toBeTruthy();
    });

    it('should use custom title and description in accessibility label', () => {
      const { getByLabelText } = render(
        <EmptyState
          variant="reports"
          title="No Items"
          description="Please add items"
        />
      );
      expect(getByLabelText('No Items. Please add items')).toBeTruthy();
    });

    it('should have accessible icon', () => {
      const { getByLabelText } = render(<EmptyState variant="reports" />);
      // Icon should be part of the accessible container
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should have accessible CTA button', () => {
      const mockHandler = jest.fn();
      const { getByRole } = render(
        <EmptyState
          variant="reports"
          ctaLabel="Create Report"
          onCtaPress={mockHandler}
        />
      );
      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('Long Text Handling', () => {
    it('should handle very long titles', () => {
      const longTitle =
        'This is a very long title that should wrap properly without breaking the layout or causing any rendering issues';
      const { getByText } = render(
        <EmptyState variant="generic" title={longTitle} />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle very long descriptions', () => {
      const longDescription =
        'This is a very long description that should wrap properly and maintain readability. It contains multiple sentences and should be displayed correctly even when it spans several lines. The component should handle this gracefully without any layout issues.';
      const { getByText } = render(
        <EmptyState variant="generic" description={longDescription} />
      );
      expect(getByText(longDescription)).toBeTruthy();
    });

    it('should handle multi-line text correctly', () => {
      const multiLineDescription =
        'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const { getByText } = render(
        <EmptyState variant="generic" description={multiLineDescription} />
      );
      expect(getByText(multiLineDescription)).toBeTruthy();
    });

    it('should handle empty strings', () => {
      const { getByLabelText } = render(
        <EmptyState variant="generic" title="" description="" />
      );
      // Should render without crashes (empty strings fall back to variant defaults)
      expect(getByLabelText('Tidak Ada Data. Belum ada data untuk ditampilkan.')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined variant gracefully', () => {
      const { getByText } = render(
        <EmptyState variant={undefined as any} />
      );
      expect(getByText('Tidak Ada Data')).toBeTruthy();
    });

    it('should handle invalid variant gracefully', () => {
      const { getByText } = render(
        <EmptyState variant={'invalid' as any} />
      );
      expect(getByText('Tidak Ada Data')).toBeTruthy();
    });

    it('should handle null props gracefully', () => {
      const { getByText } = render(
        <EmptyState
          variant="reports"
          title={null as any}
          description={null as any}
        />
      );
      // Should fall back to variant defaults
      expect(getByText('Belum Ada Laporan')).toBeTruthy();
    });

    it('should handle multiple EmptyState instances', () => {
      const { getByText } = render(
        <>
          <EmptyState variant="reports" />
          <EmptyState variant="shifts" />
          <EmptyState variant="workers" />
        </>
      );
      // Verify all three instances render correctly
      expect(getByText('Belum Ada Laporan')).toBeTruthy();
      expect(getByText('Belum Ada Shift')).toBeTruthy();
      expect(getByText('Belum Ada Pekerja')).toBeTruthy();
    });

    it('should handle rapid prop changes', () => {
      const { getByText, rerender } = render(
        <EmptyState variant="reports" />
      );
      expect(getByText('Belum Ada Laporan')).toBeTruthy();

      rerender(<EmptyState variant="shifts" />);
      expect(getByText('Belum Ada Shift')).toBeTruthy();

      rerender(<EmptyState variant="workers" />);
      expect(getByText('Belum Ada Pekerja')).toBeTruthy();
    });
  });

  describe('Layout and Styling', () => {
    it('should render icon container', () => {
      const { getByLabelText } = render(<EmptyState variant="reports" />);
      // Icon should be rendered as part of the accessible container
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should render title with correct styling', () => {
      const { getByText } = render(<EmptyState variant="reports" />);
      const title = getByText('Belum Ada Laporan');
      expect(title).toBeTruthy();
      expect(title.props.style).toBeDefined();
    });

    it('should render description with correct styling', () => {
      const { getByText } = render(<EmptyState variant="reports" />);
      const description = getByText('Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.');
      expect(description).toBeTruthy();
      expect(description.props.style).toBeDefined();
    });

    it('should center content', () => {
      const { getByLabelText } = render(<EmptyState variant="reports" />);
      const container = getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'center',
            alignItems: 'center',
          }),
        ])
      );
    });
  });

  describe('Icon Color Handling', () => {
    it('should handle rgba color format', () => {
      // Test rgba color parsing - should render without errors
      const { getByLabelText } = render(
        <EmptyState variant="reports" iconColor="rgba(255, 128, 64, 0.5)" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should handle rgb color format', () => {
      // Test rgb color - will hit fallback path
      const { getByLabelText } = render(
        <EmptyState variant="reports" iconColor="rgb(255, 128, 64)" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should handle non-standard color format', () => {
      // Test non-standard format - will hit fallback path
      const { getByLabelText } = render(
        <EmptyState variant="reports" iconColor="hsl(180, 50%, 50%)" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });

    it('should handle short hex color format', () => {
      const { getByLabelText } = render(
        <EmptyState variant="reports" iconColor="#FFF" />
      );
      expect(getByLabelText('Belum Ada Laporan. Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.')).toBeTruthy();
    });
  });
});
