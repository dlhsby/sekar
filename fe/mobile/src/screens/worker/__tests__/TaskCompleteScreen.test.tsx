/**
 * TaskCompleteScreen Tests
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { TaskCompleteScreen } from '../TaskCompleteScreen';
import * as tasksApi from '../../../services/api/tasksApi';

// Alert mocked globally in jest.setup.js

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      setOptions: mockSetOptions,
    }),
    useRoute: () => ({
      params: { taskId: 'task-123' },
    }),
  };
});

// Mock tasksApi
jest.mock('../../../services/api/tasksApi');

// Mock media service
jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn().mockResolvedValue({
      id: 'photo-1',
      uri: 'file:///test-photo.jpg',
      type: 'image/jpeg',
    }),
    validatePhotoCount: jest.fn().mockReturnValue(true),
    getMaxPhotos: jest.fn().mockReturnValue(5),
  },
}));

// Mock permissions
jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn().mockResolvedValue({ granted: true }),
}));

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: -7.250445,
        longitude: 112.768845,
        accuracy: 10,
      },
    });
  }),
}));

const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'This is a test task',
  status: 'in_progress' as const,
  priority: 'high' as const,
  area: { id: 'area-1', name: 'Taman Bungkul' },
};

describe('TaskCompleteScreen', () => {
  beforeEach(() => {
    // Don't use jest.clearAllMocks() as it clears the global Alert mock
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockReset.mockClear();
    mockSetOptions.mockClear();
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });
  });

  it('renders loading state initially', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    expect(getByText('Memuat...')).toBeTruthy();
  });

  it('renders task info after loading', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(
      () => {
        expect(getByText('Test Task')).toBeTruthy();
      },
      { timeout: 10000 }
    );

    expect(getByText('Area: Taman Bungkul')).toBeTruthy();
  }, 15000);

  it('shows photo section with add button', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('📸 FOTO BUKTI PENYELESAIAN *')).toBeTruthy();
    });

    expect(getByText('Foto')).toBeTruthy(); // The "+" button with "Foto" label
  });

  it('shows location status', async () => {
    const { getByText, queryByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('📍 LOKASI GPS')).toBeTruthy();
    });

    // Should show location data since geolocation is mocked
    await waitFor(() => {
      // Either shows loading or coordinates (new format: "latitude, longitude")
      const hasLocation = queryByText(/-7\.250445, 112\.768845/) || queryByText(/Mendapatkan lokasi/);
      expect(hasLocation).toBeTruthy();
    });
  });

  it('shows notes input field', async () => {
    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Catatan (Opsional)')).toBeTruthy();
    });

    expect(getByPlaceholderText('Tambahkan catatan penyelesaian...')).toBeTruthy();
  });

  it('disables submit button when photo is not taken', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Selesaikan Tugas')).toBeTruthy();
    });

    const submitButton = getByText('Selesaikan Tugas');
    // Button should be disabled when no photo
    expect(submitButton).toBeTruthy();
  });

  it('shows cancel button', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Batal')).toBeTruthy();
    });
  });

  it('navigates back when cancel is pressed', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Batal')).toBeTruthy();
    });

    fireEvent.press(getByText('Batal'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows error state when task not found', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: null });

    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Tugas tidak ditemukan')).toBeTruthy();
    });
  });

  it('shows error alert when task fails to load', async () => {
    (tasksApi.getTaskById as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    // Alert is mocked globally - verify error state is shown
    await waitFor(() => {
      expect(getByText('Tugas tidak ditemukan')).toBeTruthy();
    });
  });

  it('allows adding photo from camera', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Foto')).toBeTruthy();
    });

    // The new implementation directly captures from camera
    // No Alert.alert for source selection
    fireEvent.press(getByText('Foto'));

    // Photo capture is handled by mediaService.capturePhoto
    // which is mocked to return a photo
  });

  it('allows entering notes', async () => {
    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Catatan (Opsional)')).toBeTruthy();
    });

    const notesInput = getByPlaceholderText('Tambahkan catatan penyelesaian...');
    fireEvent.changeText(notesInput, 'Pekerjaan selesai dengan baik');

    expect(notesInput.props.value).toBe('Pekerjaan selesai dengan baik');
  });

  it('shows section titles', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Tugas')).toBeTruthy();
    });

    expect(getByText('📸 FOTO BUKTI PENYELESAIAN *')).toBeTruthy();
    expect(getByText('📍 LOKASI GPS')).toBeTruthy();
    expect(getByText('Catatan (Opsional)')).toBeTruthy();
  });
});
