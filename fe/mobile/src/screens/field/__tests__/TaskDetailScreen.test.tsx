/**
 * TaskDetailScreen Tests
 * Phase 2C: No accept/decline, start directly from assigned
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { TaskDetailScreen } from '../TaskDetailScreen';
import * as tasksApi from '../../../services/api/tasksApi';

// Alert mocked in jest.setup.js

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

// Alert mocked globally in jest.setup.js

const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'This is a test task description',
  status: 'assigned' as const,
  priority: 'high' as const,
  deadline: '2026-01-30T10:00:00Z',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  rayon: { id: 'rayon-1', name: 'Rayon 1' }, // Phase 2C: Added rayon
  activity_type: { id: 'at-1', name: 'Penyiraman', code: 'WATERING' },
  created_at: '2026-01-25T08:00:00Z',
  assigned_by: { id: 'user-1', full_name: 'Supervisor 1' },
  tags: [ // Phase 2C: Added tags
    { id: 'tag-1', user: { id: 'user-2', full_name: 'Worker 2' } },
    { id: 'tag-2', user: { id: 'user-3', full_name: 'Worker 3' } },
  ],
};

const renderWithNav = (component: React.ReactElement) => {
  return render(<NavigationContainer>{component}</NavigationContainer>);
};

describe('TaskDetailScreen', () => {
  beforeEach(() => {
    // Clear specific mocks (not jest.clearAllMocks() which breaks global Alert mock)
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    (tasksApi.getTaskById as jest.Mock).mockClear();
    (tasksApi.startTask as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (tasksApi.getTaskById as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { getByText } = renderWithNav(<TaskDetailScreen />);
    expect(getByText('Memuat tugas...')).toBeTruthy();
  });

  it(
    'renders task details after loading',
    async () => {
      (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

      const { findByText } = renderWithNav(<TaskDetailScreen />);

      expect(await findByText('Test Task', {}, { timeout: 10000 })).toBeTruthy();
      expect(await findByText('This is a test task description', {}, { timeout: 10000 })).toBeTruthy();
      // NBBadge converts text to uppercase
      expect(await findByText('DITUGASKAN', {}, { timeout: 10000 })).toBeTruthy();
    },
    15000
  );

  it('shows start button for assigned tasks (Phase 2C: no accept step)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText, queryByText } = renderWithNav(<TaskDetailScreen />);

    // Phase 2C: Start directly from 'assigned' (no accept/decline)
    expect(await findByText('Mulai Kerjakan')).toBeTruthy();

    // Phase 2C: No accept/decline buttons
    expect(queryByText('Terima Tugas')).toBeNull();
    expect(queryByText('Tolak Tugas')).toBeNull();
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

  it('calls startTask API when start button pressed (Phase 2C)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });
    (tasksApi.startTask as jest.Mock).mockResolvedValue({ data: {} });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    const startButton = await findByText('Mulai Kerjakan');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(tasksApi.startTask).toHaveBeenCalledWith('task-123');
    });
  });

  it('shows rayon when present (Phase 2C)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Rayon:')).toBeTruthy();
    expect(await findByText('Rayon 1')).toBeTruthy();
  });

  it('shows tagged users when present (Phase 2C)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Tag Pengguna')).toBeTruthy();
    expect(await findByText('Worker 2')).toBeTruthy();
    expect(await findByText('Worker 3')).toBeTruthy();
  });

  it('handles task without tags gracefully (Phase 2C)', async () => {
    const taskWithoutTags = { ...mockTask, tags: [] };
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: taskWithoutTags });

    const { queryByText } = renderWithNav(<TaskDetailScreen />);

    await waitFor(() => {
      expect(tasksApi.getTaskById).toHaveBeenCalled();
    });

    // Tag section should not be rendered when no tags
    expect(queryByText('Tag Pengguna')).toBeNull();
  });

  it('handles task without rayon gracefully (Phase 2C)', async () => {
    const taskWithoutRayon = { ...mockTask, rayon: null };
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: taskWithoutRayon });

    const { queryByText } = renderWithNav(<TaskDetailScreen />);

    await waitFor(() => {
      expect(tasksApi.getTaskById).toHaveBeenCalled();
    });

    // Rayon section should not be rendered when no rayon
    expect(queryByText('Rayon:')).toBeNull();
  });
});
