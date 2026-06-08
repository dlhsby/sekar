/**
 * NBEmptyState Component Tests
 */

import React from 'react';
import { render, fireEvent, configure } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NBEmptyState } from '../NBEmptyState';

// Enable querying hidden elements for accessibility tests
configure({ defaultIncludeHiddenElements: true });

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
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="noData" title="No Data" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('No Data')).toBeTruthy();
    });

    it('renders noResults variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="noResults" title="No Results" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('No Results')).toBeTruthy();
    });

    it('renders offline variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="offline" title="Offline" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Offline')).toBeTruthy();
    });

    it('renders error variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="error" title="Error" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Error')).toBeTruthy();
    });

    it('renders maintenance variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState
          variant="maintenance"
          title="Maintenance"
          testID="empty"
        />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Maintenance')).toBeTruthy();
    });

    it('renders permission variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState
          variant="permission"
          title="Permission"
          testID="empty"
        />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Permission')).toBeTruthy();
    });

    it('renders empty variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="empty" title="Empty" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Empty')).toBeTruthy();
    });

    it('renders complete variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="complete" title="Complete" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Complete')).toBeTruthy();
    });

    it('renders search variant', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState variant="search" title="Search" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Search')).toBeTruthy();
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
      const { getByTestId, getByText } = render(
        <NBEmptyState title="Custom" icon="🌟" testID="empty" />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Custom')).toBeTruthy();
    });

    it('uses custom icon instead of variant default', () => {
      const { getByTestId, getByText } = render(
        <NBEmptyState
          variant="noData"
          title="Test"
          icon="🌟"
          testID="empty"
        />,
      );
      expect(getByTestId('empty')).toBeTruthy();
      expect(getByText('Test')).toBeTruthy();
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

  describe('accessibility (NB 2.0)', () => {
    it('has alert accessibility role on container', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test" testID="empty" />,
      );
      const container = getByTestId('empty');
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('has accessibility label combining title and description', () => {
      const { getByTestId } = render(
        <NBEmptyState
          title="Error Title"
          description="Error description"
          testID="empty"
        />,
      );
      const container = getByTestId('empty');
      expect(container.props.accessibilityLabel).toBe(
        'Error Title. Error description',
      );
    });

    it('has header accessibility role on title', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test Title" testID="empty" />,
      );
      const title = getByTestId('empty-title');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('icon container is hidden from accessibility', () => {
      const { getByTestId } = render(
        <NBEmptyState title="Test" testID="empty" />,
      );
      const iconContainer = getByTestId('empty-icon-container');
      expect(iconContainer.props.accessibilityElementsHidden).toBe(true);
      expect(iconContainer.props.importantForAccessibility).toBe(
        'no-hide-descendants',
      );
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
      expect(getByTestId('error-state')).toBeTruthy();
      expect(getByText('Gagal Memuat Data')).toBeTruthy();
      expect(getByText('Terjadi kesalahan saat memuat data')).toBeTruthy();
      expect(getByText('Coba Lagi')).toBeTruthy();

      fireEvent.press(getByTestId('error-state-cta'));
      expect(mockOnCTA).toHaveBeenCalled();
    });

    it('renders complete offline state', () => {
      const { getByText, getByTestId } = render(
        <NBEmptyState
          variant="offline"
          title="Tidak Ada Koneksi"
          description="Periksa koneksi internet Anda"
          testID="offline-state"
        />,
      );
      expect(getByTestId('offline-state')).toBeTruthy();
      expect(getByText('Tidak Ada Koneksi')).toBeTruthy();
      expect(getByText('Periksa koneksi internet Anda')).toBeTruthy();
    });

    it('renders complete no results state', () => {
      const { getByText, getByTestId } = render(
        <NBEmptyState
          variant="noResults"
          title="Tidak Ada Hasil"
          description="Coba gunakan kata kunci lain"
          testID="no-results-state"
        />,
      );
      expect(getByTestId('no-results-state')).toBeTruthy();
      expect(getByText('Tidak Ada Hasil')).toBeTruthy();
      expect(getByText('Coba gunakan kata kunci lain')).toBeTruthy();
    });
  });

  describe('illustration prop', () => {
    it('renders the illustration slot (not the icon) for a known key', () => {
      const { getByTestId, queryByTestId } = render(
        <NBEmptyState
          variant="noData"
          illustration="illo-shifts"
          title="Belum Ada Shift"
          testID="illo-state"
        />,
      );
      expect(getByTestId('illo-state-illustration')).toBeTruthy();
      expect(queryByTestId('illo-state-icon-container')).toBeNull();
    });

    it('renders a custom illustration node when provided', () => {
      const { getByTestId, queryByTestId } = render(
        <NBEmptyState
          title="Custom"
          illustration={<Text testID="custom-illo">x</Text>}
          testID="custom-state"
        />,
      );
      expect(getByTestId('custom-illo')).toBeTruthy();
      expect(queryByTestId('custom-state-icon-container')).toBeNull();
    });

    it('falls back to the icon when no illustration is given', () => {
      const { getByTestId, queryByTestId } = render(
        <NBEmptyState variant="noData" title="No illo" testID="icon-state" />,
      );
      expect(getByTestId('icon-state-icon-container')).toBeTruthy();
      expect(queryByTestId('icon-state-illustration')).toBeNull();
    });

    it('falls back to the icon for an unknown string key', () => {
      const { getByTestId, queryByTestId } = render(
        <NBEmptyState
          variant="noData"
          illustration="illo-nope"
          title="Bad key"
          testID="bad-state"
        />,
      );
      expect(getByTestId('bad-state-icon-container')).toBeTruthy();
      expect(queryByTestId('bad-state-illustration')).toBeNull();
    });

    it('keeps the illustration slot hidden from accessibility', () => {
      const { getByTestId } = render(
        <NBEmptyState illustration="illo-reports" title="Test" testID="a11y-state" />,
      );
      const slot = getByTestId('a11y-state-illustration');
      expect(slot.props.accessibilityElementsHidden).toBe(true);
      expect(slot.props.importantForAccessibility).toBe('no-hide-descendants');
    });
  });
});
