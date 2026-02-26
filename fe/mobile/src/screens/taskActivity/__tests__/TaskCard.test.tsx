import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../../../types/models.types';

const BASE_TASK: Task = {
  id: 'task-1',
  title: 'Bersihkan Taman Bungkul',
  description: 'Sapu dan buang sampah',
  status: 'assigned',
  priority: 'high',
  created_at: '2026-02-22T08:00:00Z',
  updated_at: '2026-02-22T08:00:00Z',
  deadline: '2026-02-25T17:00:00Z',
  area: { id: 'area-1', name: 'Area A' } as any,
  rayon: { id: 'rayon-1', name: 'Rayon 1' } as any,
  assigned_user: { id: 'user-1', full_name: 'Budi Santoso' } as any,
  tags: [],
} as unknown as Task;

describe('TaskCard', () => {
  it('renders task title', () => {
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(getByText('Bersihkan Taman Bungkul')).toBeTruthy();
  });

  it('renders description when present', () => {
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(getByText('Sapu dan buang sampah')).toBeTruthy();
  });

  it('does not render description when absent', () => {
    const { queryByText } = render(
      <TaskCard task={{ ...BASE_TASK, description: undefined } as any} onPress={() => {}} />
    );
    expect(queryByText('Sapu dan buang sampah')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={onPress} />);
    fireEvent.press(getByText('Bersihkan Taman Bungkul'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows assigned user name', () => {
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(getByText(/Budi Santoso/)).toBeTruthy();
  });

  it('shows area name when area present', () => {
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(getByText(/Area A/)).toBeTruthy();
  });

  it('shows rayon name when no area', () => {
    const { getByText } = render(
      <TaskCard task={{ ...BASE_TASK, area: undefined } as any} onPress={() => {}} />
    );
    expect(getByText(/Rayon 1/)).toBeTruthy();
  });

  it('shows priority label', () => {
    const { getByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(getByText(/Tinggi/)).toBeTruthy();
  });

  it('shows deadline chip', () => {
    const { getAllByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    // Deadline is 2026-02-25; locale format varies — assert at least one date text contains 2026
    const dateTexts = getAllByText(/2026/);
    expect(dateTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows tags count when tags present', () => {
    const taskWithTags = { ...BASE_TASK, tags: [{ id: 't1' }, { id: 't2' }] } as any;
    const { getByText } = render(<TaskCard task={taskWithTags} onPress={() => {}} />);
    expect(getByText(/2 tag/)).toBeTruthy();
  });

  describe('status badge labels', () => {
    // NBBadge renders text uppercase; use accessibilityLabel for assertion
    const cases: Array<[Task['status'], string]> = [
      ['pending', 'Menunggu'],
      ['assigned', 'Ditugaskan'],
      ['accepted', 'Diterima'],
      ['declined', 'Ditolak'],
      ['in_progress', 'Dikerjakan'],
      ['completed', 'Menunggu Verifikasi'],
      ['verified', 'Terverifikasi'],
      ['revision_needed', 'Perlu Revisi'],
    ];

    test.each(cases)('status %s → label "%s"', (status, label) => {
      const { getByLabelText } = render(
        <TaskCard task={{ ...BASE_TASK, status } as any} onPress={() => {}} />
      );
      expect(getByLabelText(new RegExp(label, 'i'))).toBeTruthy();
    });
  });

  describe('priority labels', () => {
    const cases: Array<[string, string]> = [
      ['low', 'Rendah'],
      ['medium', 'Biasa'],
      ['high', 'Tinggi'],
      ['urgent', 'Mendesak'],
    ];

    test.each(cases)('priority %s → label "%s"', (priority, label) => {
      const { getByText } = render(
        <TaskCard task={{ ...BASE_TASK, priority } as any} onPress={() => {}} />
      );
      expect(getByText(new RegExp(label))).toBeTruthy();
    });
  });
});
