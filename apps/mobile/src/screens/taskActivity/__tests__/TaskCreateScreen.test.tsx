/**
 * TaskCreateScreen Tests
 * Tests for Phase 2C task creation with NB design, role-based access, and rayon/area selection
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NBToast } from '../../../components/nb';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { TaskCreateScreen } from '../TaskCreateScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import type { User } from '../../../types/models.types';
import * as tasksApi from '../../../services/api/tasksApi';
import * as usersApi from '../../../services/api/usersApi';
import * as rayonsApi from '../../../services/api/rayonsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock APIs
jest.mock('../../../services/api/tasksApi');
jest.mock('../../../services/api/usersApi');
jest.mock('../../../services/api/rayonsApi');

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock NBSelect (uses useSafeAreaInsets which needs SafeAreaProvider)
jest.mock('../../../components/nb/NBSelect', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    NBSelect: ({ value, onValueChange, selectedValues, onValuesChange, options, placeholder, label, disabled }: any) => {
      const isMulti = selectedValues !== undefined && onValuesChange !== undefined;

      if (isMulti) {
        const count = selectedValues?.length || 0;
        const displayLabel = count > 0 ? `${count} dipilih` : (placeholder || 'Pilih...');
        return (
          <View testID={`nb-select-${label || 'unknown'}`}>
            <TouchableOpacity
              testID={`nb-select-trigger-${label || 'unknown'}`}
              onPress={() => {
                if (!disabled && options?.length > 0) {
                  // Toggle first option for testing
                  const first = options[0].value;
                  const newValues = selectedValues?.includes(first)
                    ? selectedValues.filter((v: string) => v !== first)
                    : [...(selectedValues || []), first];
                  onValuesChange(newValues);
                }
              }}
              disabled={disabled}
            >
              <Text>{displayLabel}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      const selectedOption = options?.find((o: any) => o.value === value);
      const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Pilih...');
      return (
        <View testID={`nb-select-${label || 'unknown'}`}>
          <TouchableOpacity
            testID={`nb-select-trigger-${label || 'unknown'}`}
            onPress={() => {
              if (!disabled && options?.length > 0) {
                onValueChange?.(options[0].value);
              }
            }}
            disabled={disabled}
          >
            <Text>{displayLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

// Mock FieldHomeHeader
jest.mock('../../../components/navigation/FieldHomeHeader', () => ({
  FieldHomeHeader: ({ title, onBack }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <TouchableOpacity onPress={onBack} testID="header-back" />
        <Text>{title}</Text>
      </>
    );
  },
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
  useFocusEffect: (callback: any) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, []);
  },
  NavigationContainer: ({ children }: any) => children,
}));

// Mock useRoleAccess
import { useRoleAccess } from '../../../hooks/useRoleAccess';
jest.mock('../../../hooks/useRoleAccess', () => ({
  useRoleAccess: jest.fn(() => ({
    role: 'korlap',
    canCreateTask: true,
  })),
}));
const mockUseRoleAccess = useRoleAccess as jest.MockedFunction<typeof useRoleAccess>;

// Helper to create test store
const createTestStore = (overrides?: Record<string, any>) => {
  return configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
    reducer: {
      auth: authReducer as any,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'korlap1',
          full_name: 'Test Korlap',
          role: 'korlap' as any,
          rayon_id: 'rayon-1',
          rayon: { id: 'rayon-1', name: 'Rayon 1' },
          location_id: 'area-1',
          area: { id: 'area-1', name: 'Taman Bungkul' },
          ...overrides,
        },
        assignedArea: null,
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      } as any,
    },
  });
};

describe('TaskCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(NBToast, 'show').mockImplementation(() => {});

    // Reset AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Re-apply useRoleAccess mock (clearAllMocks resets implementations)
    mockUseRoleAccess.mockReturnValue({
      role: 'korlap' as any,
      canClock: false,
      canSubmitActivity: false,
      canCreateTask: true,
      canReceiveTask: true,
      canSubmitOvertime: false,
      canApproveOvertime: false,
      canMonitor: false,
      monitoringScope: null,
    });

    // Mock users API
    (usersApi.getUsers as jest.Mock).mockResolvedValue({
      data: [
        { id: 'u1', full_name: 'Satgas 1', role: 'satgas', location_id: 'area-1' },
        { id: 'u2', full_name: 'Satgas 2', role: 'satgas', location_id: 'area-1' },
        { id: 'u3', full_name: 'Satgas 3', role: 'satgas', location_id: 'area-2' },
      ],
    });

    // Mock rayons API
    (rayonsApi.getRayons as jest.Mock).mockResolvedValue({
      data: [
        { id: 'rayon-1', name: 'Rayon 1' },
        { id: 'rayon-2', name: 'Rayon 2' },
      ],
    });

    (rayonsApi.getAreasByRayonId as jest.Mock).mockResolvedValue({
      data: [
        { id: 'area-1', name: 'Taman Bungkul' },
        { id: 'area-2', name: 'Taman Harmoni' },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders NB sectioned form with title, description, priority, deadline fields', async () => {
    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/DETAIL TUGAS/)).toBeTruthy();
      expect(getByText(/PRIORITAS/)).toBeTruthy();
      expect(getByText(/BATAS WAKTU/)).toBeTruthy();
      expect(getByText('Judul *')).toBeTruthy();
      expect(getByText('Deskripsi')).toBeTruthy();
      expect(getByPlaceholderText('Masukkan judul tugas...')).toBeTruthy();
      expect(getByPlaceholderText('Jelaskan detail tugas...')).toBeTruthy();
    });
  });

  it('renders rayon/area location section', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/LOKASI/)).toBeTruthy();
      expect(getByText('Rayon')).toBeTruthy();
      expect(getByText('Area')).toBeTruthy();
    });
  });

  it('renders NB assignee and tag sections', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/PENUGASAN/)).toBeTruthy();
      expect(getByText(/TAG PETUGAS/)).toBeTruthy();
    });
  });

  it('validates form - shows error when no title', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(getByText('Judul harus diisi')).toBeTruthy();
    });
  });

  it('validates form - shows error when no assignee selected', async () => {
    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Fill title but skip assignee selection
    await act(async () => {
      const titleInput = getByPlaceholderText('Masukkan judul tugas...');
      fireEvent.changeText(titleInput, 'Task Without Assignee');
    });

    await waitFor(() => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(getByText('Petugas harus dipilih')).toBeTruthy();
    });
  });

  it('submits task with description as optional', async () => {
    (tasksApi.createTask as jest.Mock).mockResolvedValue({
      data: { id: '1', title: 'Title Only Task' },
    });

    const store = createTestStore();

    const { getByText, getByTestId, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Fill title only — no description
    await act(async () => {
      const titleInput = getByPlaceholderText('Masukkan judul tugas...');
      fireEvent.changeText(titleInput, 'Title Only Task');
    });

    // Priority is pre-selected as 'medium' (Biasa) by default — no action needed

    // Wait for users to load, then select assignee via NBSelect (auto-selects first)
    await waitFor(() => {
      expect(getByTestId('nb-select-trigger-Petugas')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('nb-select-trigger-Petugas'));
    });

    // Submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Title Only Task',
          assigned_to: 'u1',
        })
      );
      // description should not be in the request
      const callArg = (tasksApi.createTask as jest.Mock).mock.calls[0][0];
      expect(callArg.description).toBeUndefined();
    });
  });

  it('korlap has fixed rayon and area from profile', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      // Korlap should see their rayon/area name displayed (disabled selects show value)
      expect(getByText('Rayon 1')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });
  });

  it('shows priority options (Rendah, Biasa, Tinggi, Mendesak)', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Rendah')).toBeTruthy();
      expect(getByText('✓ Biasa')).toBeTruthy(); // default selected
      expect(getByText('Tinggi')).toBeTruthy();
      expect(getByText('Mendesak')).toBeTruthy();
    });
  });

  it('defaults to medium priority (Biasa)', async () => {
    const store = createTestStore();

    const { getByText, queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      // 'Biasa' (medium) should have a checkmark by default
      expect(getByText('✓ Biasa')).toBeTruthy();
      // Other priorities should not have checkmarks
      expect(queryByText('✓ Rendah')).toBeNull();
      expect(queryByText('✓ Tinggi')).toBeNull();
      expect(queryByText('✓ Mendesak')).toBeNull();
    });
  });

  it('restricts access for non-creator roles', async () => {
    mockUseRoleAccess.mockReturnValue({
      role: 'satgas' as any,
      canCreateTask: false,
      canApproveOvertime: false,
      canSubmitOvertime: false,
      canSubmitActivity: true,
      canClock: false,
      canReceiveTask: true,
      canMonitor: false,
      monitoringScope: null,
    });

    const store = createTestStore({ role: 'satgas' });

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(NBToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'danger', title: 'Akses Ditolak' }),
      );
    });
  });

  it('fetches assignable users on mount', async () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(usersApi.getUsers).toHaveBeenCalled();
    });
  });

  it('renders fixed FAB buttons (Batal + Buat Tugas)', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Batal')).toBeTruthy();
      expect(getByText('Buat Tugas')).toBeTruthy();
    });
  });

  it('submits task successfully', async () => {
    (tasksApi.createTask as jest.Mock).mockResolvedValue({
      data: { id: '1', title: 'New Task' },
    });

    const store = createTestStore();

    const { getByText, getByTestId, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Fill form
    await act(async () => {
      const titleInput = getByPlaceholderText('Masukkan judul tugas...');
      fireEvent.changeText(titleInput, 'Test Task');
    });

    await act(async () => {
      const descriptionInput = getByPlaceholderText('Jelaskan detail tugas...');
      fireEvent.changeText(descriptionInput, 'Test Description');
    });

    // Priority is pre-selected as 'medium' (Biasa) by default — no action needed

    // Select assignee via NBSelect
    await waitFor(() => {
      expect(getByTestId('nb-select-trigger-Petugas')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('nb-select-trigger-Petugas'));
    });

    // Submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalled();
      // Should clear draft on successful submit
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('task_create_draft');
    });
  });

  it('handles submit error', async () => {
    (tasksApi.createTask as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Failed to create task',
    });

    const store = createTestStore();

    const { getByText, getByTestId, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Fill form
    await act(async () => {
      const titleInput = getByPlaceholderText('Masukkan judul tugas...');
      fireEvent.changeText(titleInput, 'Test Task');
    });

    await act(async () => {
      const descriptionInput = getByPlaceholderText('Jelaskan detail tugas...');
      fireEvent.changeText(descriptionInput, 'Test Description');
    });

    // Priority is pre-selected as 'medium' (Biasa) by default — no action needed

    // Select assignee via NBSelect
    await waitFor(() => {
      expect(getByTestId('nb-select-trigger-Petugas')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('nb-select-trigger-Petugas'));
    });

    // Submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(NBToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'danger', title: 'Gagal', body: 'Failed to create task' }),
      );
    });
  });

  it('management can select rayon and area', async () => {
    mockUseRoleAccess.mockReturnValue({
      role: 'management' as any,
      canClock: false,
      canSubmitActivity: false,
      canCreateTask: true,
      canReceiveTask: false,
      canSubmitOvertime: false,
      canApproveOvertime: false,
      canMonitor: true,
      monitoringScope: 'rayon',
    });

    const store = createTestStore({ role: 'management', rayon_id: undefined, location_id: undefined });

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Should fetch rayons for management
    await waitFor(() => {
      expect(rayonsApi.getRayons).toHaveBeenCalled();
    });
  });

  it('restores draft on mount when draft exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        title: 'Draft Title',
        description: 'Draft Description',
        priority: 'high',
        assignedTo: '',
        taggedUserIds: [],
        timestamp: Date.now(), // fresh draft
      })
    );

    const store = createTestStore();

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('task_create_draft');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Draft Ditemukan',
        'Anda memiliki draft tugas yang belum terkirim. Lanjutkan?',
        expect.any(Array)
      );
    });
  });

  it('shows save draft prompt when pressing Batal with content', async () => {
    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Add some content
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Masukkan judul tugas...'), 'Some Title');
    });

    // Press Batal
    await act(async () => {
      fireEvent.press(getByText('Batal'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Data yang telah diisi akan hilang.',
        'Data yang telah diisi akan hilang.',
        expect.any(Array)
      );
    });
  });

  it('uses NBSelect for assignee selection', async () => {
    const store = createTestStore();

    const { getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Assignee should be an NBSelect with label "Petugas"
    await waitFor(() => {
      expect(getByTestId('nb-select-Petugas')).toBeTruthy();
    });
  });

  it('kepala_rayon has fixed rayon but can select area', async () => {
    mockUseRoleAccess.mockReturnValue({
      role: 'kepala_rayon' as any,
      canClock: false,
      canSubmitActivity: false,
      canCreateTask: true,
      canReceiveTask: false,
      canSubmitOvertime: false,
      canApproveOvertime: false,
      canMonitor: true,
      monitoringScope: 'rayon',
    });

    const store = createTestStore({ role: 'kepala_rayon', location_id: undefined, area: undefined });

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Should fetch areas for their rayon
    await waitFor(() => {
      expect(rayonsApi.getAreasByRayonId).toHaveBeenCalledWith('rayon-1');
    });

    // Should NOT fetch all rayons (rayon is fixed)
    expect(rayonsApi.getRayons).not.toHaveBeenCalled();
  });
});
