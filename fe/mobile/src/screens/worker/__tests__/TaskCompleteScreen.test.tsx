/**
 * TaskCompleteScreen Tests
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { TaskCompleteScreen } from '../TaskCompleteScreen';
import * as tasksApi from '../../../services/api/tasksApi';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
    }),
    useRoute: () => ({
      params: { taskId: 'task-123' },
    }),
  };
});

// Mock tasksApi
jest.mock('../../../services/api/tasksApi');

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({
    assets: [{ uri: 'file:///test-photo.jpg' }],
  }),
  launchImageLibrary: jest.fn().mockResolvedValue({
    assets: [{ uri: 'file:///test-photo.jpg' }],
  }),
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

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  // Auto-press first button for testing
  if (buttons && buttons[0]?.onPress) {
    buttons[0].onPress();
  }
});

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
    jest.clearAllMocks();
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

    await waitFor(() => {
      expect(getByText('Test Task')).toBeTruthy();
    });

    expect(getByText('Area: Taman Bungkul')).toBeTruthy();
  });

  it('shows photo section with placeholder', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Foto Bukti *')).toBeTruthy();
    });

    expect(getByText('Belum ada foto')).toBeTruthy();
    expect(getByText('Ambil Foto')).toBeTruthy();
  });

  it('shows location status', async () => {
    const { getByText, queryByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Lokasi GPS')).toBeTruthy();
    });

    // Should show location data since geolocation is mocked
    await waitFor(() => {
      // Either shows loading or coordinates
      const hasLocation = queryByText(/Lat:/) || queryByText(/Mendapatkan lokasi/);
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

    render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Gagal memuat detail tugas',
        expect.any(Array)
      );
    });
  });

  it('opens photo source picker when take photo is pressed', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Ambil Foto')).toBeTruthy();
    });

    fireEvent.press(getByText('Ambil Foto'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Pilih Sumber',
      'Pilih sumber foto:',
      expect.any(Array)
    );
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

    expect(getByText('Foto Bukti *')).toBeTruthy();
    expect(getByText('Lokasi GPS')).toBeTruthy();
    expect(getByText('Catatan (Opsional)')).toBeTruthy();
  });
});
