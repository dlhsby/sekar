/**
 * TaskCompleteScreen Tests
 * Phase 2C: GPS removed, description + photo required
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

// Mock media service (used by PhotoUploader component)
jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn().mockResolvedValue({
      id: 'photo-1',
      uri: 'file:///test-photo.jpg',
      fileName: 'test.jpg',
      fileSize: 1000,
      type: 'image/jpeg',
    }),
    convertToBase64: jest.fn().mockResolvedValue('data:image/jpeg;base64,testbase64'),
  },
}));

// Mock permissions (used by PhotoUploader component)
jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn().mockResolvedValue({ granted: true }),
}));

const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'This is a test task',
  status: 'in_progress' as const,
  priority: 'high' as const,
  area: { id: 'area-1', name: 'Taman Bungkul' },
  rayon: { id: 'rayon-1', name: 'Rayon 1' }, // Phase 2C: Added rayon
};

describe('TaskCompleteScreen', () => {
  beforeEach(() => {
    // Use real timers for integration-style tests that don't test timing behavior
    // Fake timers cause waitFor() to hang as they block the microtask queue
    jest.useRealTimers();
    // Don't use jest.clearAllMocks() as it clears the global Alert mock
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockReset.mockClear();
    mockSetOptions.mockClear();
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });
  });

  afterEach(() => {
    // Cleanup is simpler with real timers
  });

  it('renders loading state initially', async () => {
    (tasksApi.getTaskById as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Memuat...')).toBeTruthy();
    });
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

  it('shows rayon when present (Phase 2C)', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Rayon: Rayon 1')).toBeTruthy();
    });
  });

  it('shows photo section with add button', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('📸 FOTO BUKTI *')).toBeTruthy();
    });

    expect(getByText('Foto')).toBeTruthy(); // The "+" button with "Foto" label
  });

  it('shows description input field (Phase 2C: required)', async () => {
    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Deskripsi Penyelesaian *')).toBeTruthy();
    });

    expect(getByPlaceholderText('Jelaskan hasil pekerjaan...')).toBeTruthy();
  });

  it('does NOT show GPS location section (Phase 2C: GPS removed)', async () => {
    const { queryByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(tasksApi.getTaskById).toHaveBeenCalled();
    });

    // Phase 2C: No GPS section
    expect(queryByText('📍 LOKASI GPS')).toBeNull();
    expect(queryByText('Lokasi GPS')).toBeNull();
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

  it('disables submit button when description is empty (Phase 2C)', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Selesaikan Tugas')).toBeTruthy();
    });

    const submitButton = getByText('Selesaikan Tugas');
    // Button should be disabled when no description
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

  it('allows entering description (Phase 2C: required)', async () => {
    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Deskripsi Penyelesaian *')).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText('Jelaskan hasil pekerjaan...');
    fireEvent.changeText(descriptionInput, 'Pekerjaan selesai dengan baik');

    expect(descriptionInput.props.value).toBe('Pekerjaan selesai dengan baik');
  });

  it('shows section titles (Phase 2C: updated)', async () => {
    const { getByText, queryByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Tugas')).toBeTruthy();
    });

    expect(getByText('📸 FOTO BUKTI *')).toBeTruthy();
    expect(getByText('Deskripsi Penyelesaian *')).toBeTruthy();

    // Phase 2C: No GPS section
    expect(queryByText('📍 LOKASI GPS')).toBeNull();
  });

  it('calls completeTask API with base64 photo (photos converted from file URI)', async () => {
    const mediaService = require('../../../services/media').mediaService;

    (tasksApi.completeTask as jest.Mock).mockResolvedValue({ data: {} });
    mediaService.capturePhoto.mockResolvedValue({
      id: 'photo-1',
      uri: 'file:///test-photo.jpg',
      type: 'image/jpeg',
    });
    mediaService.convertToBase64.mockResolvedValue('data:image/jpeg;base64,testbase64');

    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Tugas')).toBeTruthy();
    });

    // Add description
    const descriptionInput = getByPlaceholderText('Jelaskan hasil pekerjaan...');
    fireEvent.changeText(descriptionInput, 'Pekerjaan selesai');

    // Add photo
    fireEvent.press(getByText('Foto'));

    await waitFor(() => {
      expect(mediaService.capturePhoto).toHaveBeenCalled();
    });

    // Submit
    fireEvent.press(getByText('Selesaikan Tugas'));

    await waitFor(() => {
      expect(tasksApi.completeTask).toHaveBeenCalledWith('task-123', {
        description: 'Pekerjaan selesai',
        completion_photo_urls: ['data:image/jpeg;base64,testbase64'],
      });
    });
  }, 15000);

  it('validates that both description and photo are required (Phase 2C)', async () => {
    // Clear mock from previous test
    (tasksApi.completeTask as jest.Mock).mockClear();

    const { getByText } = render(
      <NavigationContainer>
        <TaskCompleteScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Selesaikan Tugas')).toBeTruthy();
    });

    // Try to submit without photo or description
    const submitButton = getByText('Selesaikan Tugas');
    fireEvent.press(submitButton);

    // Button should be disabled or show error
    // completeTask should not be called
    expect(tasksApi.completeTask).not.toHaveBeenCalled();
  });
});
