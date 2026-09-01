/**
 * ProfileScreen (PRF-1) composition tests — loading state, role-dependent sections,
 * navigation wiring, ChangePassword/About modal gating, and logout.
 *
 * Child components + data hooks are mocked so this focuses on ProfileScreen's own
 * composition and handler wiring.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';

const mockLoadData = jest.fn().mockResolvedValue(undefined);
const mockHandleLogout = jest.fn();
let mockProfileDataReturn: any;

jest.mock('../../../hooks/useProfileData', () => ({
  useProfileData: () => mockProfileDataReturn,
}));
jest.mock('../../../hooks/useProfileSync', () => ({
  useProfileSync: () => ({
    syncStatus: { pendingCount: 0, failedCount: 0 },
    isSyncing: false,
    loadSyncStatus: jest.fn().mockResolvedValue(undefined),
    handleSyncNow: jest.fn(),
    handleRetryFailed: jest.fn(),
    handleClearFailed: jest.fn(),
  }),
}));
jest.mock('../../../hooks/useProfileLogout', () => ({
  useProfileLogout: () => ({ handleLogout: mockHandleLogout }),
}));
jest.mock('../../../services/location/locationTracker', () => ({
  locationTracker: { isTracking: jest.fn(() => false), stop: jest.fn() },
}));
jest.mock('../../../services/api/districtsApi', () => ({
  getDistricts: jest.fn().mockResolvedValue({ data: [] }),
}));

// Child component mocks
jest.mock('../../../components/common/ProfileHeader', () => ({
  ProfileHeader: ({ user }: any) => {
    const { Text: T } = require('react-native');
    return <T testID="profile-header">{user?.full_name ?? 'none'}</T>;
  },
}));
jest.mock('../../../components/profile/ProfileStatsRow', () => ({
  ProfileStatsRow: ({ mode }: any) => {
    const { Text: T } = require('react-native');
    return <T testID={`stats-${mode}`}>stats</T>;
  },
}));
jest.mock('../../../components/common/SyncStatusCard', () => ({
  SyncStatusCard: () => null,
}));
jest.mock('../../../components/profile/AssignedAreaCard', () => ({
  AssignedAreaCard: () => {
    const { Text: T } = require('react-native');
    return <T testID="assigned-area">area</T>;
  },
}));
jest.mock('../../../components/profile/AssignedKecamatanCard', () => ({
  AssignedKecamatanCard: () => {
    const { Text: T } = require('react-native');
    return <T testID="assigned-kecamatan">kec</T>;
  },
}));
jest.mock('../../../components/common', () => ({
  ChangePasswordModal: ({ visible }: any) => {
    const { Text: T } = require('react-native');
    return visible ? <T testID="change-password-open">open</T> : null;
  },
}));
jest.mock('../../../components/common/ProfileMenu', () => ({
  ProfileMenu: (props: any) => {
    const RN = require('react-native');
    const Btn = (id: string, fn?: () => void) =>
      fn ? <RN.TouchableOpacity testID={id} onPress={fn}><RN.Text>{id}</RN.Text></RN.TouchableOpacity> : null;
    return (
      <RN.View testID="profile-menu">
        {Btn('m-edit', props.onEditProfile)}
        {Btn('m-password', props.onChangePassword)}
        {Btn('m-shift', props.onShiftHistory)}
        {Btn('m-settings', props.onSettings)}
        {Btn('m-about', props.onAbout)}
        {Btn('m-logout', props.onLogout)}
      </RN.View>
    );
  },
}));

const navigation = { navigate: jest.fn() };

function baseData(over: any = {}) {
  return {
    user: { id: 'u1', username: 'satgas1', full_name: 'Budi Santoso', role: 'satgas' },
    assignedArea: { name: 'Taman X' },
    profileData: null,
    isField: true,
    isStaffKecamatan: false,
    isLoading: false,
    setIsLoading: jest.fn(),
    fieldStats: { daysWorked: 5, totalHours: 40, activitiesCount: 12 },
    monitoringStats: { totalUsersManaged: 3, totalAreasMonitored: 2, activitiesReviewedThisMonth: 9 },
    loadData: mockLoadData,
    ...over,
  };
}

const renderScreen = () => render(<ProfileScreen navigation={navigation} />);

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileDataReturn = baseData();
  });

  it('shows the loading state while profile data loads', () => {
    mockProfileDataReturn = baseData({ isLoading: true });
    const { getByText } = renderScreen();
    expect(getByText('Memuat profil...')).toBeTruthy();
  });

  it('renders the hero, field stats, area card, and menu for a field user', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('profile-header')).toBeTruthy();
    expect(getByTestId('stats-field')).toBeTruthy();
    expect(getByTestId('assigned-area')).toBeTruthy();
    expect(getByTestId('profile-menu')).toBeTruthy();
  });

  it('renders monitoring stats + no area card for a monitoring role', () => {
    mockProfileDataReturn = baseData({ isField: false });
    const { getByTestId, queryByTestId } = renderScreen();
    expect(getByTestId('stats-monitoring')).toBeTruthy();
    expect(queryByTestId('assigned-area')).toBeNull();
  });

  it('renders the kecamatan card and no stats for staff_kecamatan', () => {
    mockProfileDataReturn = baseData({ isField: false, isStaffKecamatan: true });
    const { getByTestId, queryByTestId } = renderScreen();
    expect(getByTestId('assigned-kecamatan')).toBeTruthy();
    expect(queryByTestId('stats-field')).toBeNull();
    expect(queryByTestId('stats-monitoring')).toBeNull();
  });

  it('shows the Riwayat Shift menu row only for field roles', () => {
    const { getByTestId, rerender } = renderScreen();
    expect(getByTestId('m-shift')).toBeTruthy();
    mockProfileDataReturn = baseData({ isField: false });
    rerender(<ProfileScreen navigation={navigation} />);
    // monitoring → onShiftHistory undefined → row not rendered
    expect(() => getByTestId('m-shift')).toThrow();
  });

  it.each([
    ['m-edit', 'EditProfile'],
    ['m-shift', 'ShiftHistory'],
    ['m-settings', 'Settings'],
  ])('navigates from %s to %s', (testID, dest) => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(testID));
    expect(navigation.navigate).toHaveBeenCalledWith(dest);
  });

  it('keeps the ChangePassword modal closed until opened', () => {
    const { queryByTestId, getByTestId } = renderScreen();
    expect(queryByTestId('change-password-open')).toBeNull();
    fireEvent.press(getByTestId('m-password'));
    expect(getByTestId('change-password-open')).toBeTruthy();
  });

  it('opens the About modal from the menu', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('m-about'));
    expect(getByText('Tentang SEKAR')).toBeTruthy();
  });

  it('wires the logout row to the logout handler', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('m-logout'));
    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
