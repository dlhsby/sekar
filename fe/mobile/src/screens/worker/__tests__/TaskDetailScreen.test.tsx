/**
 * TaskDetailScreen Tests
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { TaskDetailScreen } from '../TaskDetailScreen';
import * as tasksApi from '../../../services/api/tasksApi';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    }),
    useRoute: () => ({
      params: { taskId: 'task-123' },
    }),
  };
});

// Mock tasksApi
jest.mock('../../../services/api/tasksApi');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(Alert, 'prompt').mockImplementation(() => {});

const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'This is a test task description',
  status: 'assigned' as const,
  priority: 'high' as const,
  deadline: '2026-01-30T10:00:00Z',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  activity_type: { id: 'at-1', name: 'Penyiraman', code: 'WATERING' },
  created_at: '2026-01-25T08:00:00Z',
  assigned_by: { id: 'user-1', full_name: 'Supervisor 1' },
};

const renderWithNav = (component: React.ReactElement) => {
  return render(<NavigationContainer>{component}</NavigationContainer>);
};

describe('TaskDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (tasksApi.getTaskById as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { getByText } = renderWithNav(<TaskDetailScreen />);
    expect(getByText('Memuat tugas...')).toBeTruthy();
  });

  it('renders task details after loading', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Test Task')).toBeTruthy();
    expect(await findByText('This is a test task description')).toBeTruthy();
    // NBBadge converts text to uppercase
    expect(await findByText('DITUGASKAN')).toBeTruthy();
  });

  it('shows accept and decline buttons for assigned tasks', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Terima Tugas')).toBeTruthy();
    expect(await findByText('Tolak Tugas')).toBeTruthy();
  });

  it('shows start button for accepted tasks', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: { ...mockTask, status: 'accepted' },
    });

    const { findByText, queryByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Mulai Kerjakan')).toBeTruthy();
    // Should not show accept/decline buttons
    expect(queryByText('Terima Tugas')).toBeNull();
  });

  it('shows complete button for in_progress tasks', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: { ...mockTask, status: 'in_progress' },
    });

    const { findByText, queryByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Selesaikan Tugas')).toBeTruthy();
    expect(queryByText('Mulai Kerjakan')).toBeNull();
  });

  it('shows error state when task is not found', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: null });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Tugas Tidak Ditemukan')).toBeTruthy();
    expect(await findByText('Tugas yang Anda cari tidak ditemukan atau telah dihapus')).toBeTruthy();
  });

  it('navigates back when back button is pressed', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: null });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    const backButton = await findByText('Kembali');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows decline reason for declined tasks', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: {
        ...mockTask,
        status: 'declined',
        decline_reason: 'Area terlalu jauh',
      },
    });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Alasan Penolakan')).toBeTruthy();
    expect(await findByText('Area terlalu jauh')).toBeTruthy();
  });

  it('shows completion details for completed tasks', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: {
        ...mockTask,
        status: 'completed',
        completed_at: '2026-01-26T15:30:00Z',
        completion_notes: 'Tugas selesai dengan baik',
      },
    });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Detail Penyelesaian')).toBeTruthy();
    expect(await findByText('Tugas selesai dengan baik')).toBeTruthy();
  });

  it('navigates to TaskComplete when complete button pressed', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: { ...mockTask, status: 'in_progress' },
    });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    const completeButton = await findByText('Selesaikan Tugas');
    fireEvent.press(completeButton);

    expect(mockNavigate).toHaveBeenCalledWith('TaskComplete', { taskId: 'task-123' });
  });

  it('calls acceptTask API when accept button pressed', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });
    (tasksApi.acceptTask as jest.Mock).mockResolvedValue({ data: {} });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    const acceptButton = await findByText('Terima Tugas');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(tasksApi.acceptTask).toHaveBeenCalledWith('task-123');
    });
  });
});
