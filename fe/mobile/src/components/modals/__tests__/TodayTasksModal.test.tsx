/**
 * TodayTasksModal tests — v2.1 bottom sheet listing today's active tasks.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayTasksModal } from '../TodayTasksModal';
import type { Task } from '../../../types/models.types';

const task = (over: Partial<Task>): Task =>
  ({
    id: 't1',
    title: 'Pangkas pohon Trembesi',
    status: 'assigned',
    priority: 'high',
    deadline: new Date('2026-02-15T10:00:00Z').toISOString(),
    area: { id: 1, name: 'Zona A' },
    created_by: 'u9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  }) as unknown as Task;

describe('TodayTasksModal', () => {
  const onClose = jest.fn();
  const onTaskPress = jest.fn();

  afterEach(() => jest.clearAllMocks());

  it('renders the uppercase title with the task count', () => {
    const { getByText } = render(
      <TodayTasksModal visible onClose={onClose} tasks={[task({}), task({ id: 't2' })]} />
    );
    expect(getByText('TUGAS HARI INI (2)')).toBeTruthy();
  });

  it('lists each task with its status pill and fires onTaskPress', () => {
    const { getByText, getByTestId } = render(
      <TodayTasksModal visible onClose={onClose} tasks={[task({})]} onTaskPress={onTaskPress} />
    );
    expect(getByTestId('today-task-t1')).toBeTruthy();
    expect(getByText('Pangkas pohon Trembesi')).toBeTruthy();
    expect(getByText('Siap mulai')).toBeTruthy();

    fireEvent.press(getByText('Pangkas pohon Trembesi'));
    expect(onTaskPress).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('shows an empty hint when there are no tasks', () => {
    const { getByText } = render(<TodayTasksModal visible onClose={onClose} tasks={[]} />);
    expect(getByText('Tidak ada tugas aktif hari ini')).toBeTruthy();
  });

  it('closes via the NBModal close button', () => {
    const { getByLabelText } = render(<TodayTasksModal visible onClose={onClose} tasks={[]} />);
    fireEvent.press(getByLabelText('Tutup'));
    expect(onClose).toHaveBeenCalled();
  });
});
