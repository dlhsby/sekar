/**
 * ActivityDetailScreen Tests
 * Tests for Phase 2C activity detail view
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityDetailScreen } from '../ActivityDetailScreen';
import * as activitiesApi from '../../../services/api/activitiesApi';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock APIs
jest.mock('../../../services/api/activitiesApi');

// Mock store hooks — ActivityDetailScreen uses useAppSelector for auth user
jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(() => null),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockRoute = {
  params: {
    activityId: '1',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
  useRoute: () => mockRoute,
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
  NavigationContainer: ({ children }: any) => children,
}));

describe('ActivityDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not call setOptions for header (header managed by MainNavigator via FieldHomeHeader)', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity',
      photo_urls: [],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:00:00Z',
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    // Phase 2C: header is fully managed by MainNavigator (FieldHomeHeader with onBack prop).
    // ActivityDetailScreen no longer calls setOptions for back button or title.
    await waitFor(() => {
      expect(mockSetOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headerLeft: expect.any(Function),
        })
      );
    });
  });

  it('shows loading indicator while fetching', async () => {
    (activitiesApi.getActivityById as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: null }), 1000);
        })
    );

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    expect(getByText('Memuat data...')).toBeTruthy();
  });

  it('renders activity detail after fetch', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity description',
      activityType: {
        id: '1',
        name: 'Menyapu',
      },
      area: {
        id: '1',
        name: 'Park A',
      },
      photo_urls: ['https://example.com/photo1.jpg'],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:00:00Z',
      user: {
        id: '1',
        full_name: 'Test User',
      },
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Test activity description')).toBeTruthy();
      expect(getByText('Test User')).toBeTruthy();
    });
  });

  it('shows activity type name', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity',
      activityType: {
        id: '1',
        name: 'Menyiram',
      },
      photo_urls: [],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:00:00Z',
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText(/JENIS AKTIVITAS/)).toBeTruthy();
      expect(getByText('Menyiram')).toBeTruthy();
    });
  });

  it('shows description', async () => {
    const mockActivity = {
      id: '1',
      description: 'Detailed activity description here',
      photo_urls: [],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:00:00Z',
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText(/DESKRIPSI PEKERJAAN/)).toBeTruthy();
      expect(getByText('Detailed activity description here')).toBeTruthy();
    });
  });

  it('shows photos', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity',
      photo_urls: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:00:00Z',
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText(/FOTO AKTIVITAS/)).toBeTruthy();
      expect(getByText('2 foto dilampirkan')).toBeTruthy();
    });
  });

  it('shows GPS coordinates', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity',
      photo_urls: [],
      gps_lat: -7.256789,
      gps_lng: 112.754321,
      created_at: '2026-02-14T10:00:00Z',
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText(/LOKASI GPS/)).toBeTruthy();
      expect(getByText('-7.256789, 112.754321')).toBeTruthy();
    });
  });

  it('shows general information card with timestamp and user', async () => {
    const mockActivity = {
      id: '1',
      description: 'Test activity',
      photo_urls: [],
      gps_lat: -7.25,
      gps_lng: 112.75,
      created_at: '2026-02-14T10:30:00Z',
      user: {
        id: '1',
        full_name: 'John Doe',
      },
      area: {
        id: '1',
        name: 'Park A',
      },
    };

    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: mockActivity,
    });

    const { getByText } = render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      // Check merged card header
      expect(getByText(/INFORMASI UMUM/)).toBeTruthy();
      // Check time information
      expect(getByText('Tanggal & Waktu')).toBeTruthy();
      // Check user information
      expect(getByText('Nama Petugas')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      // Check area information
      expect(getByText('Area')).toBeTruthy();
      expect(getByText('Park A')).toBeTruthy();
    });
  });

  it('handles API error - shows alert and navigates to Activities', async () => {
    (activitiesApi.getActivityById as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Activity not found',
    });

    render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Activity not found');
      expect(mockNavigate).toHaveBeenCalledWith('Activities');
    });
  });

  it('handles exception - shows alert and navigates to Activities', async () => {
    (activitiesApi.getActivityById as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <NavigationContainer>
        <ActivityDetailScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Gagal memuat detail aktivitas'
      );
      expect(mockNavigate).toHaveBeenCalledWith('Activities');
    });
  });
});
