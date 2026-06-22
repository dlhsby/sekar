/**
 * TaskDetailScreen Tests
 * Phase 2C: 8-status workflow with accept/decline + verify/revision
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

// Mock store hooks — role gating uses useAppSelector for auth user
const mockUseAppSelector = jest.fn();
jest.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Alert mocked globally in jest.setup.js

const ASSIGNEE_USER = { id: 'assignee-1', role: 'satgas', full_name: 'Satgas 1' };
const VERIFIER_USER = { id: 'verifier-1', role: 'korlap', full_name: 'Korlap 1' };

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
  assigned_to: 'assignee-1', // Phase 2C: for isAssignee check
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
    // Default: logged-in user is the assignee (satgas role)
    mockUseAppSelector.mockReturnValue(ASSIGNEE_USER);

    // Clear specific mocks (not jest.clearAllMocks() which breaks global Alert mock)
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    mockUseAppSelector.mockClear();
    // Re-set default after clear
    mockUseAppSelector.mockReturnValue(ASSIGNEE_USER);
    (tasksApi.getTaskById as jest.Mock).mockClear();
    (tasksApi.startTask as jest.Mock).mockClear();
    if ((tasksApi.acceptTask as jest.Mock).mockClear) {
      (tasksApi.acceptTask as jest.Mock).mockClear();
    }
    if ((tasksApi.declineTask as jest.Mock).mockClear) {
      (tasksApi.declineTask as jest.Mock).mockClear();
    }
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

  it('shows accept/decline buttons for assigned tasks (Phase 2C: 8-status workflow)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText, queryByText } = renderWithNav(<TaskDetailScreen />);

    // Phase 2C: accept/decline required before start
    expect(await findByText('Terima')).toBeTruthy();
    expect(await findByText('Tolak')).toBeTruthy();

    // Phase 2C: No start button until task is accepted
    expect(queryByText('Mulai Kerjakan')).toBeNull();
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

    expect(mockNavigate).toHaveBeenCalledWith('Tasks');
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

  it('calls startTask API when start button pressed (Phase 2C: requires accepted status)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({
      data: { ...mockTask, status: 'accepted' as const },
    });
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

    // Rayon name displayed inline (no "Rayon:" prefix)
    expect(await findByText('Rayon 1')).toBeTruthy();
  });

  it('shows tagged users when present (Phase 2C, May 12 label update)', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    expect(await findByText('Tag Petugas Terlibat')).toBeTruthy();
    expect(await findByText('Worker 2')).toBeTruthy();
    expect(await findByText('Worker 3')).toBeTruthy();
  });

  it('shows empty-state CTA when no tags but caller can edit (May 12)', async () => {
    // Status must be accepted/in_progress/revision_needed for the
    // assignee to qualify as editor (May 12 late refinement). Pre-accept
    // (status='assigned') only the creator can tag.
    const taskWithoutTags = { ...mockTask, status: 'in_progress' as const, tags: [] };
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: taskWithoutTags });

    const { findByText, queryByText } = renderWithNav(<TaskDetailScreen />);

    // Section IS now rendered for creator/accepted-assignee even when empty,
    // so they can tap the pencil icon to add tags.
    expect(await findByText('Tag Petugas Terlibat')).toBeTruthy();
    expect(queryByText('Worker 2')).toBeNull();
    expect(queryByText('Worker 3')).toBeNull();
  });

  it('handles task without rayon gracefully (Phase 2C)', async () => {
    const taskWithoutRayon = { ...mockTask, rayon: null };
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: taskWithoutRayon });

    const { queryByText } = renderWithNav(<TaskDetailScreen />);

    await waitFor(() => {
      expect(tasksApi.getTaskById).toHaveBeenCalled();
    });

    // Rayon name should not be in output when rayon is absent
    expect(queryByText('Rayon 1')).toBeNull();
  });

  it('shows Riwayat Tugas button for audit trail', async () => {
    (tasksApi.getTaskById as jest.Mock).mockResolvedValue({ data: mockTask });

    const { findByText } = renderWithNav(<TaskDetailScreen />);

    const riwayatButton = await findByText('Riwayat Tugas');
    expect(riwayatButton).toBeTruthy();

    // Pressing should not throw
    expect(() => fireEvent.press(riwayatButton)).not.toThrow();
  });
});
