import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TasksTab } from '../tabs/TasksTab';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

const BASE_PROPS = {
  tasks: [],
  loadingTasks: false,
  isLoadingMore: false,
  hasMore: false,
  tasksError: null,
  refreshing: false,
  taskFilter: 'assigned' as const,
  onRefresh: () => {},
  onRetry: () => {},
  onLoadMore: () => {},
  onNavigateToTask: () => {},
};

describe('TasksTab', () => {
  it('renders loading state with skeleton', () => {
    const { queryByText } = render(
      <TasksTab {...BASE_PROPS} loadingTasks={true} />
    );
    // When loading, shows skeleton (does not render empty state)
    expect(queryByText('Belum ada tugas')).toBeFalsy();
  });

  it('renders empty state when no tasks', () => {
    const { getByText } = render(
      <TasksTab {...BASE_PROPS} />
    );
    expect(getByText('Belum ada tugas')).toBeTruthy();
  });

  it('renders error state with retry button and fires onRetry', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(
      <TasksTab {...BASE_PROPS} tasksError="Koneksi terputus" onRetry={mockRetry} />
    );
    expect(getByText('Gagal memuat tugas')).toBeTruthy(); // NBEmptyState title
    expect(getByText('Koneksi terputus')).toBeTruthy(); // description = tasksError
    const cta = getByText('Coba Lagi');
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('shows filtered-empty state when isFiltered is set', () => {
    const { getByText } = render(
      <TasksTab {...BASE_PROPS} tasks={[]} isFiltered onRetry={jest.fn()} />
    );
    expect(getByText('Tidak ada tugas yang cocok')).toBeTruthy();
  });
});
