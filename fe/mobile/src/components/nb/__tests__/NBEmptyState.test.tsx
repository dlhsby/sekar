/**
 * NBEmptyState Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NBEmptyState } from '../NBEmptyState';

describe('NBEmptyState', () => {
  const mockOnCTA = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title only', () => {
      const { getByText } = render(
        <NBEmptyState title="Tidak Ada Data" testID="empty-state" />,
      );
      expect(getByText('Tidak Ada Data')).toBeTruthy();
    });

    it('renders with title and description', () => {
      const { getByText } = render(
        <NBEmptyState
          title="Tidak Ada Data"
          description="Data akan muncul di sini"
          testID="empty-state"
        />,
      );
      expect(getByText('Tidak Ada Data')).toBeTruthy();
      expect(getByText('Data akan muncul di sini')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test" testID="empty-test" />,
      );
      expect(getByTestId('empty-test')).toBeTruthy();
    });

    it('renders icon container with testID', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test" testID="empty-test" />,
      );
      expect(getByTestId('empty-test-icon-container')).toBeTruthy();
    });

    it('renders title with testID', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test Title" testID="empty-test" />,
      );
      expect(getByTestId('empty-test-title')).toBeTruthy();
    });

    it('renders description with testID', () => {
      const { getByTestId } = render(
        <NBEmptyState
          title="Test"
          description="Test description"
          testID="empty-test"
        />,
      );
      expect(getByTestId('empty-test-description')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders noData variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="noData" title="No Data" testID="empty" />,
      );
      expect(getByText('📭')).toBeTruthy();
    });

    it('renders noResults variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="noResults" title="No Results" testID="empty" />,
      );
      expect(getByText('🔍')).toBeTruthy();
    });

    it('renders offline variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="offline" title="Offline" testID="empty" />,
      );
      expect(getByText('📡')).toBeTruthy();
    });

    it('renders error variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="error" title="Error" testID="empty" />,
      );
      expect(getByText('⚠️')).toBeTruthy();
    });

    it('renders maintenance variant', () => {
      const { getByText } = render(
        <NBEmptyState
          variant="maintenance"
          title="Maintenance"
          testID="empty"
        />,
      );
      expect(getByText('🔧')).toBeTruthy();
    });

    it('renders permission variant', () => {
      const { getByText } = render(
        <NBEmptyState
          variant="permission"
          title="Permission"
          testID="empty"
        />,
      );
      expect(getByText('🔒')).toBeTruthy();
    });

    it('renders empty variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="empty" title="Empty" testID="empty" />,
      );
      expect(getByText('📂')).toBeTruthy();
    });

    it('renders complete variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="complete" title="Complete" testID="empty" />,
      );
      expect(getByText('✅')).toBeTruthy();
    });

    it('renders search variant', () => {
      const { getByText } = render(
        <NBEmptyState variant="search" title="Search" testID="empty" />,
      );
      expect(getByText('🔎')).toBeTruthy();
    });

    it('uses variant default description when description not provided', () => {
      const { getByText } = render(
        <NBEmptyState variant="noData" title="Test" testID="empty" />,
      );
      expect(getByText('Belum ada data tersedia')).toBeTruthy();
    });

    it('overrides default description with custom description', () => {
      const { getByText, queryByText } = render(
        <NBEmptyState
          variant="noData"
          title="Test"
          description="Custom description"
          testID="empty"
        />,
      );
      expect(getByText('Custom description')).toBeTruthy();
      expect(queryByText('Belum ada data tersedia')).toBeNull();
    });
  });

  describe('custom icon', () => {
    it('renders custom icon component', () => {
      const CustomIcon = () => <Text testID="custom-icon">🎨</Text>;
      const { getByTestId } = render(
        <NBEmptyState
          title="Custom Icon"
          icon={<CustomIcon />}
          testID="empty"
        />,
      );
      expect(getByTestId('custom-icon')).toBeTruthy();
    });

    it('renders custom icon string', () => {
      const { getByText } = render(
        <NBEmptyState title="Custom" icon="🌟" testID="empty" />,
      );
      expect(getByText('🌟')).toBeTruthy();
    });

    it('uses custom icon instead of variant default', () => {
      const { getByText, queryByText } = render(
        <NBEmptyState
          variant="noData"
          title="Test"
          icon="🌟"
          testID="empty"
        />,
      );
      expect(getByText('🌟')).toBeTruthy();
      expect(queryByText('📭')).toBeNull();
    });
  });

  describe('CTA button', () => {
    it('renders CTA button when ctaLabel and onCTA provided', () => {
      const { getByText } = render(
        <NBEmptyState
          title="Error"
          ctaLabel="Retry"
          onCTA={mockOnCTA}
          testID="empty"
        />,
      );
      expect(getByText('Retry')).toBeTruthy();
    });

    it('does not render CTA button when only ctaLabel provided', () => {
      const { queryByText } = render(
        <NBEmptyState title="Error" ctaLabel="Retry" testID="empty" />,
      );
      expect(queryByText('Retry')).toBeNull();
    });

    it('does not render CTA button when only onCTA provided', () => {
      const { queryByTestId } = render(
        <NBEmptyState title="Error" onCTA={mockOnCTA} testID="empty" />,
      );
      expect(queryByTestId('empty-cta')).toBeNull();
    });

    it('calls onCTA when CTA button pressed', () => {
      const { getByTestId } = render(
        <NBEmptyState
          title="Error"
          ctaLabel="Retry"
          onCTA={mockOnCTA}
          testID="empty"
        />,
      );
      fireEvent.press(getByTestId('empty-cta'));
      expect(mockOnCTA).toHaveBeenCalledTimes(1);
    });

    it('renders CTA button with testID', () => {
      const { getByTestId } = render(
        <NBEmptyState
          title="Error"
          ctaLabel="Retry"
          onCTA={mockOnCTA}
          testID="empty"
        />,
      );
      expect(getByTestId('empty-cta')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBEmptyState title="Test" style={customStyle} testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customStyle = { fontSize: 24 };
      const { getByTestId } = render(
        <NBEmptyState
          title="Test"
          titleStyle={customStyle}
          testID="empty"
        />,
      );
      expect(getByTestId('empty')).toBeTruthy();
    });

    it('applies custom description style', () => {
      const customStyle = { color: 'red' };
      const { getByTestId } = render(
        <NBEmptyState
          title="Test"
          description="Test description"
          descriptionStyle={customStyle}
          testID="empty"
        />,
      );
      expect(getByTestId('empty')).toBeTruthy();
    });
  });

  describe('complete examples', () => {
    it('renders complete error state with retry', () => {
      const { getByText, getByTestId } = render(
        <NBEmptyState
          variant="error"
          title="Gagal Memuat Data"
          description="Terjadi kesalahan saat memuat data"
          ctaLabel="Coba Lagi"
          onCTA={mockOnCTA}
          testID="error-state"
        />,
      );
      expect(getByText('⚠️')).toBeTruthy();
      expect(getByText('Gagal Memuat Data')).toBeTruthy();
      expect(getByText('Terjadi kesalahan saat memuat data')).toBeTruthy();
      expect(getByText('Coba Lagi')).toBeTruthy();

      fireEvent.press(getByTestId('error-state-cta'));
      expect(mockOnCTA).toHaveBeenCalled();
    });

    it('renders complete offline state', () => {
      const { getByText } = render(
        <NBEmptyState
          variant="offline"
          title="Tidak Ada Koneksi"
          description="Periksa koneksi internet Anda"
          testID="offline-state"
        />,
      );
      expect(getByText('📡')).toBeTruthy();
      expect(getByText('Tidak Ada Koneksi')).toBeTruthy();
      expect(getByText('Periksa koneksi internet Anda')).toBeTruthy();
    });

    it('renders complete no results state', () => {
      const { getByText } = render(
        <NBEmptyState
          variant="noResults"
          title="Tidak Ada Hasil"
          description="Coba gunakan kata kunci lain"
          testID="no-results-state"
        />,
      );
      expect(getByText('🔍')).toBeTruthy();
      expect(getByText('Tidak Ada Hasil')).toBeTruthy();
      expect(getByText('Coba gunakan kata kunci lain')).toBeTruthy();
    });
  });
});
