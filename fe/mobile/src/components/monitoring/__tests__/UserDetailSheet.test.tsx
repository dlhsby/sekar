/**
 * UserDetailSheet Component Tests
 * Phase 2D: Bottom sheet showing user detail when a marker or list card is tapped.
 * Tests rendering, day summary, action buttons, and onClose / onTrailPress callbacks.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { UserDetailSheet } from '../UserDetailSheet';
import type { LiveUser, UserDaySummary } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');

  const BottomSheet = React.forwardRef(({ children, onClose }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      snapToIndex: jest.fn(),
      close: jest.fn(),
    }));
    return React.createElement(View, { testID: 'bottom-sheet' }, children);
  });
  BottomSheet.displayName = 'BottomSheet';

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView: ({ children }: any) =>
      React.createElement(ScrollView, { testID: 'bs-scroll' }, children),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const createMockUser = (overrides?: Partial<LiveUser>): LiveUser => ({
  id: 'user-123',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-123',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.250445,
  longitude: 112.768845,
  accuracy: 10,
  battery_level: 85,
  last_update: '2026-03-05T08:00:00Z',
  is_within_area: true,
  shift_id: 'shift-123',
  shift_name: 'Shift Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-03-05T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

const mockDaySummary: UserDaySummary = {
  user_id: 'user-123',
  full_name: 'Ahmad Satgas',
  username: 'satgas1',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-123',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  shift: {
    id: 'shift-123',
    name: 'Shift Pagi',
    clock_in_time: '2026-03-05T07:00:00Z',
    clock_out_time: null,
    duration_minutes: 120,
    outside_boundary: false,
  },
  last_location: {
    latitude: -7.250445,
    longitude: 112.768845,
    accuracy: 10,
    battery_level: 85,
    logged_at: '2026-03-05T09:00:00Z',
    is_within_area: true,
  },
  activities_today: [
    { id: 'act-1', title: 'Penyiraman', activity_type: 'watering', created_at: '2026-03-05T08:00:00Z', photo_url: null },
  ],
  tasks_today: [
    { id: 'task-1', title: 'Potong rumput', status: 'in_progress', priority: 'medium' },
  ],
  whatsapp_links: {
    chat: 'https://wa.me/628123456789',
    call: 'https://wa.me/628123456789',
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserDetailSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnTrailPress = jest.fn();

  const defaultProps = {
    user: createMockUser(),
    daySummary: mockDaySummary,
    isLoadingDaySummary: false,
    onClose: mockOnClose,
    onTrailPress: mockOnTrailPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Null guard ──────────────────────────────────────────────────────────────

  describe('null guard', () => {
    it('returns null when user prop is null', () => {
      const { queryByTestId } = render(
        <UserDetailSheet
          {...defaultProps}
          user={null}
        />
      );
      expect(queryByTestId('bottom-sheet')).toBeNull();
    });
  });

  // ── Basic rendering ─────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the bottom sheet when user is provided', () => {
      const { getByTestId } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('displays the user full name', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Ahmad Satgas')).toBeTruthy();
    });

    it('displays the role label in the header meta line', () => {
      const { getAllByText } = render(<UserDetailSheet {...defaultProps} />);
      // ROLE_LABELS['satgas'] === 'Satgas' — may appear in icon mock too
      expect(getAllByText(/Satgas/).length).toBeGreaterThanOrEqual(1);
    });

    it('displays the area name in the header meta line', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText(/Taman A/)).toBeTruthy();
    });
  });

  // ── Status badge ────────────────────────────────────────────────────────────

  describe('status badge', () => {
    it('shows "Aktif" status label for active status', () => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} user={createMockUser({ status: 'active' })} />
      );
      expect(getByText('Aktif')).toBeTruthy();
    });

    it('shows "Idle" status label for inactive status', () => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} user={createMockUser({ status: 'inactive' })} />
      );
      expect(getByText('Idle')).toBeTruthy();
    });

    it('shows "Di Luar Area" status label for outside_area status', () => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} user={createMockUser({ status: 'outside_area' })} />
      );
      expect(getByText('Di Luar Area')).toBeTruthy();
    });

    it('shows "Tidak Terdeteksi" status label for missing status', () => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} user={createMockUser({ status: 'missing' })} />
      );
      expect(getByText('Tidak Terdeteksi')).toBeTruthy();
    });
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows ActivityIndicator when isLoadingDaySummary is true', () => {
      const { UNSAFE_getByType } = render(
        <UserDetailSheet {...defaultProps} isLoadingDaySummary={true} daySummary={null} />
      );
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('does not show ActivityIndicator when isLoadingDaySummary is false', () => {
      const { UNSAFE_queryByType } = render(
        <UserDetailSheet {...defaultProps} isLoadingDaySummary={false} />
      );
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });
  });

  // ── Shift info section ──────────────────────────────────────────────────────

  describe('shift info section', () => {
    it('renders "Info Shift" section title', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Info Shift')).toBeTruthy();
    });

    it('renders shift name when shift data is available', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Shift Pagi')).toBeTruthy();
    });

    it('shows "Belum ada data shift hari ini" when daySummary has no shift', () => {
      const noShiftSummary: UserDaySummary = { ...mockDaySummary, shift: null };
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={noShiftSummary} />
      );
      expect(getByText('Belum ada data shift hari ini')).toBeTruthy();
    });

    it('shows "Di Dalam Area" boundary label when outside_boundary is false', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Di Dalam Area')).toBeTruthy();
    });

    it('shows "Di Luar Area" boundary label when outside_boundary is true', () => {
      const outsideSummary: UserDaySummary = {
        ...mockDaySummary,
        shift: { ...mockDaySummary.shift!, outside_boundary: true },
      };
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={outsideSummary} />
      );
      // The boundary row value
      const matches = getByText('Di Luar Area');
      expect(matches).toBeTruthy();
    });
  });

  // ── Last location ───────────────────────────────────────────────────────────

  describe('last location section', () => {
    it('renders last location coordinates from daySummary', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      // -7.250445 toFixed(4) = '-7.2504', 112.768845 toFixed(4) = '112.7688'
      expect(getByText('-7.2504, 112.7688')).toBeTruthy();
    });

    it('falls back to user coordinates when daySummary has no last_location', () => {
      const noLocationSummary: UserDaySummary = {
        ...mockDaySummary,
        last_location: null,
      };
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={noLocationSummary} />
      );
      expect(getByText('-7.2504, 112.7688')).toBeTruthy();
    });
  });

  // ── Activities list ─────────────────────────────────────────────────────────

  describe('activities today section', () => {
    it('renders activity title when activities exist', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Penyiraman')).toBeTruthy();
    });

    it('renders activities section title with count', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Aktivitas Hari Ini (1)')).toBeTruthy();
    });

    it('does not render activities section when activities list is empty', () => {
      const noActivitiesSummary: UserDaySummary = {
        ...mockDaySummary,
        activities_today: [],
      };
      const { queryByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={noActivitiesSummary} />
      );
      expect(queryByText(/Aktivitas Hari Ini/)).toBeNull();
    });
  });

  // ── Tasks list ──────────────────────────────────────────────────────────────

  describe('tasks today section', () => {
    it('renders task title when tasks exist', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Potong rumput')).toBeTruthy();
    });

    it('renders task status badge text', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('in_progress')).toBeTruthy();
    });

    it('renders tasks section title with count', () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps} />);
      expect(getByText('Tugas Hari Ini (1)')).toBeTruthy();
    });

    it('does not render tasks section when tasks list is empty', () => {
      const noTasksSummary: UserDaySummary = {
        ...mockDaySummary,
        tasks_today: [],
      };
      const { queryByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={noTasksSummary} />
      );
      expect(queryByText(/Tugas Hari Ini/)).toBeNull();
    });
  });

  // ── Action buttons ──────────────────────────────────────────────────────────

  describe('action buttons', () => {
    it('calls Linking.openURL with WhatsApp URL when WhatsApp button is pressed', async () => {
      const { getByLabelText } = render(<UserDetailSheet {...defaultProps} />);
      fireEvent.press(getByLabelText('WhatsApp'));
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringMatching(/^https:\/\/wa\.me\/62/)
        );
      });
    });

    it('calls Linking.openURL with tel: URL when Telepon button is pressed', async () => {
      const { getByLabelText } = render(<UserDetailSheet {...defaultProps} />);
      fireEvent.press(getByLabelText('Telepon'));
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringMatching(/^tel:\+62/)
        );
      });
    });

    it('does not call Linking.openURL when WhatsApp pressed and phone is null', () => {
      const userNoPhone = createMockUser({ phone: null });
      const { getByLabelText } = render(
        <UserDetailSheet {...defaultProps} user={userNoPhone} />
      );
      fireEvent.press(getByLabelText('WhatsApp'));
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('calls onTrailPress with the current user when Trail button is pressed', () => {
      const user = createMockUser();
      const { getByLabelText } = render(
        <UserDetailSheet {...defaultProps} user={user} />
      );
      fireEvent.press(getByLabelText('Trail'));
      expect(mockOnTrailPress).toHaveBeenCalledTimes(1);
      expect(mockOnTrailPress).toHaveBeenCalledWith(user);
    });

    it('calls onClose when the close button is pressed', () => {
      const { getByLabelText } = render(<UserDetailSheet {...defaultProps} />);
      fireEvent.press(getByLabelText('Tutup'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders without crashing when daySummary is null', () => {
      const { getByTestId } = render(
        <UserDetailSheet {...defaultProps} daySummary={null} />
      );
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('normalises phone number starting with 0 to 62 prefix for WhatsApp', async () => {
      const user = createMockUser({ phone: '08123456789' });
      const { getByLabelText } = render(
        <UserDetailSheet {...defaultProps} user={user} />
      );
      fireEvent.press(getByLabelText('WhatsApp'));
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/628123456789');
      });
    });

    it('renders multiple activities up to the display cap without crashing', () => {
      const manySummary: UserDaySummary = {
        ...mockDaySummary,
        activities_today: Array.from({ length: 8 }, (_, i) => ({
          id: `act-${i}`,
          title: `Aktivitas ${i + 1}`,
          activity_type: 'general',
          created_at: '2026-03-05T08:00:00Z',
          photo_url: null,
        })),
      };
      const { getByText } = render(
        <UserDetailSheet {...defaultProps} daySummary={manySummary} />
      );
      // Component slices at 5 — first item still shows
      expect(getByText('Aktivitas 1')).toBeTruthy();
    });
  });
});
