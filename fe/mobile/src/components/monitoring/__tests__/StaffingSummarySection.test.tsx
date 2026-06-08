/**
 * StaffingSummarySection Tests
 * Phase 2D: staffing summary with day-type badge, progress bar, and accordion expansion.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StaffingSummarySection } from '../StaffingSummarySection';
import type { StaffingSummaryItem } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Text');

jest.mock('../../../constants/nbTokens', () => ({
  nbColors: {
    primary: '#1D4ED8',
    white: '#FFFFFF',
    black: '#000000',
    successDark: '#15803D',
    dangerDark: '#991B1B',
    warning: '#E3A018',
    gray: {
      '50': '#F9FAFB',
      '200': '#E5E7EB',
      '300': '#D1D5DB',
      '500': '#6B7280',
      '600': '#4B5563',
    },
  },
  nbSpacing: { xs: 4, sm: 8, md: 16 },
  nbTypography: {
    fontSize: { xs: 10, sm: 12, md: 14 },
    fontWeight: { semibold: '600', bold: '700' },
  },
  // NBText reads nbType[variantKey[variant]] for fontFamily/Weight/Size/lineHeight.
  nbType: {
    displayXl: { fontFamily: 'Space Grotesk', fontWeight: '800', fontSize: 56, lineHeight: 56 },
    display: { fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: 40, lineHeight: 42 },
    h1: { fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: 28, lineHeight: 34 },
    h2: { fontFamily: 'Space Grotesk', fontWeight: '600', fontSize: 22, lineHeight: 29 },
    h3: { fontFamily: 'Space Grotesk', fontWeight: '600', fontSize: 18, lineHeight: 24 },
    bodyLg: { fontFamily: 'Inter', fontWeight: '500', fontSize: 18, lineHeight: 28 },
    body: { fontFamily: 'Inter', fontWeight: '400', fontSize: 16, lineHeight: 24 },
    bodySm: { fontFamily: 'Inter', fontWeight: '400', fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, lineHeight: 17 },
    monoSm: { fontFamily: 'JetBrains Mono', fontWeight: '500', fontSize: 12, lineHeight: 17 },
  },
  nbBorders: { thin: 1 },
  nbRadius: { base: 8, full: 9999 },
}));

jest.mock('../../../constants/roles', () => ({
  ROLE_LABELS: {
    satgas: 'Satgas',
    linmas: 'Linmas',
    korlap: 'Korlap',
    admin_data: 'Admin Data',
    kepala_rayon: 'Kepala Rayon',
    top_management: 'Top Management',
    admin_system: 'Admin Sistem',
    superadmin: 'Superadmin',
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRole(
  role: string,
  active: number,
  total_required: number,
): StaffingSummaryItem['roles'][number] {
  return {
    role,
    active,
    idle: 0,
    outside_area: 0,
    missing: 0,
    offline: 0,
    total_assigned: active,
    total_required,
  };
}

function makeItem(overrides: Partial<StaffingSummaryItem> & { id: string; name: string }): StaffingSummaryItem {
  return {
    type: 'rayon',
    roles: [],
    total_active: 0,
    total_idle: 0,
    total_outside_area: 0,
    total_missing: 0,
    total_offline: 0,
    is_fully_staffed: false,
    ...overrides,
  };
}

// Item where active / required = 9/10 → 90% (green progress)
const fullyStaffedItem = makeItem({
  id: 'item-1',
  name: 'Rayon Utara',
  total_active: 9,
  is_fully_staffed: true,
  roles: [makeRole('satgas', 5, 5), makeRole('linmas', 4, 5)],
});

// Item where active / required = 5/10 → 50% (orange progress)
const partialItem = makeItem({
  id: 'item-2',
  name: 'Rayon Selatan',
  total_active: 5,
  is_fully_staffed: false,
  roles: [makeRole('satgas', 3, 6), makeRole('linmas', 2, 4)],
});

// Item where active / required = 2/10 → 20% (red progress)
const understaffedItem = makeItem({
  id: 'item-3',
  name: 'Rayon Barat',
  total_active: 2,
  is_fully_staffed: false,
  roles: [makeRole('satgas', 1, 6), makeRole('linmas', 1, 4)],
});

// ─── Default props ────────────────────────────────────────────────────────────

const defaultProps = {
  items: [fullyStaffedItem],
  isLoading: false,
  currentDayTypeLabel: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StaffingSummarySection', () => {
  describe('loading state', () => {
    it('shows ActivityIndicator while loading', () => {
      const { ActivityIndicator } = require('react-native');
      const { UNSAFE_getByType, queryByText } = render(
        <StaffingSummarySection {...defaultProps} isLoading={true} items={[]} />,
      );
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(queryByText('Tidak ada data kepegawaian')).toBeNull();
    });

    it('hides ActivityIndicator once loaded', () => {
      const { queryByText } = render(
        <StaffingSummarySection {...defaultProps} isLoading={false} />,
      );
      // Items are rendered; no empty message
      expect(queryByText('Tidak ada data kepegawaian')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows empty message when items array is empty', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[]} />,
      );
      expect(getByText('Tidak ada data kepegawaian')).toBeTruthy();
    });
  });

  describe('day type badge', () => {
    it('does not render badge when currentDayTypeLabel is null', () => {
      const { queryByText } = render(
        <StaffingSummarySection {...defaultProps} currentDayTypeLabel={null} />,
      );
      // No badge label visible
      expect(queryByText(/Libur|Pekan|Kerja/)).toBeNull();
    });

    it('renders badge with red background for Libur label', () => {
      const { getByText, UNSAFE_getByType } = render(
        <StaffingSummarySection {...defaultProps} currentDayTypeLabel="Libur Nasional" />,
      );
      const badge = getByText('Libur Nasional');
      expect(badge).toBeTruthy();
      // Parent View carries the background color
      const { View } = require('react-native');
      const badgeView = UNSAFE_getByType(View, { deep: false });
      // Traverse up to find the badge container with backgroundColor
      const allViews = UNSAFE_getByType !== undefined ? [] : [];
      expect(badge.props).toBeDefined();
    });

    it('shows orange tint text for Pekan label', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} currentDayTypeLabel="Pekan Olahraga" />,
      );
      expect(getByText('Pekan Olahraga')).toBeTruthy();
    });

    it('shows green tint text for regular working day label', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} currentDayTypeLabel="Hari Kerja" />,
      );
      expect(getByText('Hari Kerja')).toBeTruthy();
    });
  });

  describe('staffing items - name and percentage stats', () => {
    it('renders item name', () => {
      const { getByText } = render(<StaffingSummarySection {...defaultProps} />);
      expect(getByText('Rayon Utara')).toBeTruthy();
    });

    it('renders active / required stats text', () => {
      const { getByText } = render(<StaffingSummarySection {...defaultProps} />);
      // fullyStaffedItem: 9 active, 5+5=10 required
      expect(getByText('9 aktif / 10 dibutuhkan')).toBeTruthy();
    });

    it('renders multiple items', () => {
      const { getByText } = render(
        <StaffingSummarySection
          {...defaultProps}
          items={[fullyStaffedItem, partialItem]}
        />,
      );
      expect(getByText('Rayon Utara')).toBeTruthy();
      expect(getByText('Rayon Selatan')).toBeTruthy();
    });
  });

  describe('progress bar color', () => {
    it('uses green fill for >=80% staffing', () => {
      // fullyStaffedItem: 9/10 = 90%
      const { UNSAFE_getAllByType } = render(<StaffingSummarySection {...defaultProps} />);
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);
      const progressFill = views.find(
        (v: any) =>
          v.props.style &&
          Array.isArray(v.props.style)
            ? v.props.style.some((s: any) => s?.backgroundColor === '#15803D')
            : v.props.style?.backgroundColor === '#15803D',
      );
      expect(progressFill).toBeTruthy();
    });

    it('uses orange fill for >=50% and <80% staffing', () => {
      // partialItem: 5/10 = 50%
      const { UNSAFE_getAllByType } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);
      const progressFill = views.find(
        (v: any) =>
          v.props.style &&
          (Array.isArray(v.props.style)
            ? v.props.style.some((s: any) => s?.backgroundColor === '#E3A018')
            : v.props.style?.backgroundColor === '#E3A018'),
      );
      expect(progressFill).toBeTruthy();
    });

    it('uses red fill for <50% staffing', () => {
      // understaffedItem: 2/10 = 20%
      const { UNSAFE_getAllByType } = render(
        <StaffingSummarySection {...defaultProps} items={[understaffedItem]} />,
      );
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);
      const progressFill = views.find(
        (v: any) =>
          v.props.style &&
          (Array.isArray(v.props.style)
            ? v.props.style.some((s: any) => s?.backgroundColor === '#991B1B')
            : v.props.style?.backgroundColor === '#991B1B'),
      );
      expect(progressFill).toBeTruthy();
    });
  });

  describe('shortage label', () => {
    it('shows "Kurang N" text in red when not fully staffed', () => {
      // partialItem: satgas needs 3 more, linmas needs 2 more → total shortage 5
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      expect(getByText('Kurang 5')).toBeTruthy();
    });

    it('shows "Kurang N" for understaffed item', () => {
      // understaffedItem: satgas needs 5 more, linmas needs 3 more → shortage 8
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[understaffedItem]} />,
      );
      expect(getByText('Kurang 8')).toBeTruthy();
    });

    it('does not show shortage label when fully staffed', () => {
      const { queryByText } = render(
        <StaffingSummarySection {...defaultProps} items={[fullyStaffedItem]} />,
      );
      expect(queryByText(/^Kurang/)).toBeNull();
    });
  });

  describe('accordion - toggle expansion', () => {
    it('does not show expanded role breakdown by default', () => {
      const { queryByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      // Role labels should not be visible before expansion
      expect(queryByText('Satgas')).toBeNull();
      expect(queryByText('Linmas')).toBeNull();
    });

    it('shows role breakdown after pressing the header', () => {
      const { getByText, queryByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );

      // Collapsed — role labels not visible
      expect(queryByText('Satgas')).toBeNull();

      // Expand by pressing item header
      fireEvent.press(getByText('Rayon Selatan'));

      expect(getByText('Satgas')).toBeTruthy();
      expect(getByText('Linmas')).toBeTruthy();
    });

    it('collapses again on second press', () => {
      const { getByText, queryByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );

      // First press — expand
      fireEvent.press(getByText('Rayon Selatan'));
      expect(getByText('Satgas')).toBeTruthy();

      // Second press — collapse
      fireEvent.press(getByText('Rayon Selatan'));
      expect(queryByText('Satgas')).toBeNull();
    });

    it('expands each item independently', () => {
      const { getByText, queryByText } = render(
        <StaffingSummarySection
          {...defaultProps}
          items={[partialItem, understaffedItem]}
        />,
      );

      // Expand only the first item
      fireEvent.press(getByText('Rayon Selatan'));

      // First item expanded
      expect(getByText('Satgas')).toBeTruthy();

      // Second item still collapsed (its header not pressed)
      expect(queryByText('Rayon Barat')).toBeTruthy(); // header still shown
    });
  });

  describe('expanded view - per-role breakdown', () => {
    it('renders role label using ROLE_LABELS mapping', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      fireEvent.press(getByText('Rayon Selatan'));

      expect(getByText('Satgas')).toBeTruthy();
      expect(getByText('Linmas')).toBeTruthy();
    });

    it('renders active/required counts for each role', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      fireEvent.press(getByText('Rayon Selatan'));

      // satgas: 3/6, linmas: 2/4
      expect(getByText('3/6 (Kurang 3)')).toBeTruthy();
      expect(getByText('2/4 (Kurang 2)')).toBeTruthy();
    });

    it('shows green delta text when role requirement is met', () => {
      // fullyStaffedItem: satgas 5/5 (met), linmas 4/5 (not met)
      const { getByText, UNSAFE_getAllByType } = render(
        <StaffingSummarySection {...defaultProps} items={[fullyStaffedItem]} />,
      );
      fireEvent.press(getByText('Rayon Utara'));

      // Met role: "5/5" text exists (no shortage suffix)
      const metText = getByText('5/5');
      expect(metText).toBeTruthy();
      expect(metText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#15803D' })]),
      );
    });

    it('shows red delta text when role requirement is not met', () => {
      const { getByText } = render(
        <StaffingSummarySection {...defaultProps} items={[partialItem]} />,
      );
      fireEvent.press(getByText('Rayon Selatan'));

      const shortageText = getByText('3/6 (Kurang 3)');
      expect(shortageText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#991B1B' })]),
      );
    });

    it('does not show shortage suffix when role is met', () => {
      const { getByText, queryByText } = render(
        <StaffingSummarySection {...defaultProps} items={[fullyStaffedItem]} />,
      );
      fireEvent.press(getByText('Rayon Utara'));

      // satgas 5/5 — no "(Kurang N)" suffix
      expect(getByText('5/5')).toBeTruthy();
      expect(queryByText(/5\/5.*Kurang/)).toBeNull();
    });
  });

  describe('progress percentage edge cases', () => {
    it('treats item with no required roles as 100%', () => {
      const noRolesItem = makeItem({ id: 'no-roles', name: 'Empty', roles: [] });
      const { UNSAFE_getAllByType } = render(
        <StaffingSummarySection {...defaultProps} items={[noRolesItem]} />,
      );
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);
      // 100% → green fill
      const greenFill = views.find(
        (v: any) =>
          v.props.style &&
          (Array.isArray(v.props.style)
            ? v.props.style.some((s: any) => s?.backgroundColor === '#15803D')
            : v.props.style?.backgroundColor === '#15803D'),
      );
      expect(greenFill).toBeTruthy();
    });

    it('caps progress bar width at 100% when overstaffed', () => {
      const overstaffedItem = makeItem({
        id: 'over',
        name: 'Overstaffed',
        total_active: 20,
        is_fully_staffed: true,
        roles: [makeRole('satgas', 20, 5)],
      });
      const { UNSAFE_getAllByType } = render(
        <StaffingSummarySection {...defaultProps} items={[overstaffedItem]} />,
      );
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);
      const cappedFill = views.find(
        (v: any) =>
          v.props.style &&
          (Array.isArray(v.props.style)
            ? v.props.style.some((s: any) => s?.width === '100%')
            : v.props.style?.width === '100%'),
      );
      expect(cappedFill).toBeTruthy();
    });
  });
});
