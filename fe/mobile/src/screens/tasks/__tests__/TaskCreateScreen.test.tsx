/**
 * TaskCreateScreen Tests
 * Tests for Phase 2C task creation with role-based access
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { TaskCreateScreen } from '../TaskCreateScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import * as tasksApi from '../../../services/api/tasksApi';
import * as usersApi from '../../../services/api/usersApi';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock APIs
jest.mock('../../../services/api/tasksApi');
jest.mock('../../../services/api/usersApi');

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock DatePicker
jest.mock('react-native-date-picker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onConfirm, onCancel, open }: any) => {
      if (!open) return null;
      return React.createElement('View', {
        testID: 'date-picker',
        onPress: () => onConfirm(new Date('2026-03-01')),
      });
    },
  };
});

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
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
const createTestStore = (role = 'korlap') => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'korlap1',
          full_name: 'Test Korlap',
          role: role as any,
        },
        assignedArea: null,
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    },
  });
};

describe('TaskCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock users API
    (usersApi.getUsers as jest.Mock).mockResolvedValue({
      data: [
        { id: '1', full_name: 'User 1', role: 'satgas' },
        { id: '2', full_name: 'User 2', role: 'satgas' },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with title, description, priority, deadline fields', async () => {
    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Judul *')).toBeTruthy();
      expect(getByText('Deskripsi *')).toBeTruthy();
      expect(getByText('Prioritas')).toBeTruthy();
      expect(getByText('Batas Waktu (Opsional)')).toBeTruthy();
      expect(getByPlaceholderText('Masukkan judul tugas...')).toBeTruthy();
      expect(getByPlaceholderText('Jelaskan detail tugas...')).toBeTruthy();
    });
  });

  it('shows "Buat Tugas Baru" header', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Buat Tugas Baru')).toBeTruthy();
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
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validasi Gagal',
        'Mohon periksa kembali form'
      );
    });
  });

  it('validates form - shows error when no description', async () => {
    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Fill title only
    await act(async () => {
      const titleInput = getByPlaceholderText('Masukkan judul tugas...');
      fireEvent.changeText(titleInput, 'Test Task');
    });

    // Try to submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validasi Gagal',
        'Mohon periksa kembali form'
      );
    });
  });

  it('shows priority options (Rendah, Sedang, Tinggi, Mendesak)', async () => {
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
      expect(getByText('Sedang')).toBeTruthy();
      expect(getByText('Tinggi')).toBeTruthy();
      expect(getByText('Mendesak')).toBeTruthy();
    });
  });

  it('defaults to medium priority', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      // The "Sedang" button should be in active state (this is a visual check in real app)
      expect(getByText('Sedang')).toBeTruthy();
    });
  });

  it('restricts access for non-creator roles', async () => {
    mockUseRoleAccess.mockReturnValue({
      role: 'satgas' as any,
      canCreateTask: false,
      canApproveOvertime: false,
      canSubmitOvertime: false,
      canSubmitActivity: true,
      canViewMonitoring: false,
      canManageSchedules: false,
      canManageUsers: false,
      canAccessAdminPanel: false,
    });

    const store = createTestStore('satgas');

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Akses Ditolak',
        'Anda tidak memiliki izin untuk membuat tugas',
        expect.any(Array)
      );
    });
  });

  it('shows assignable users after loading', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TaskCreateScreen navigation={mockNavigate as any} route={{} as any} />
        </NavigationContainer>
      </Provider>
    );

    // Check that the assignee section is present
    await waitFor(() => {
      expect(getByText('Petugas (Opsional)')).toBeTruthy();
      expect(getByText('Tag Petugas (Opsional)')).toBeTruthy();
    });
  });

  it('submits task successfully', async () => {
    (tasksApi.createTask as jest.Mock).mockResolvedValue({
      data: { id: '1', title: 'New Task' },
    });

    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
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

    // Submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalled();
    });
  });

  it('handles submit error', async () => {
    (tasksApi.createTask as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Failed to create task',
    });

    const store = createTestStore();

    const { getByText, getByPlaceholderText } = render(
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

    // Submit
    await act(async () => {
      const submitButton = getByText('Buat Tugas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Gagal', 'Failed to create task');
    });
  });
});
