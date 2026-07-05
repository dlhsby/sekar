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
  assignee: { id: 'user-1', full_name: 'Budi Santoso' } as any,
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

  it('shows creator role and name when creator present', () => {
    const task = { ...BASE_TASK, creator: { role: 'korlap', full_name: 'Andi' } } as any;
    const { getByText } = render(<TaskCard task={task} onPress={() => {}} />);
    expect(getByText(/korlap · Andi/)).toBeTruthy();
  });

  it('omits creator row when creator absent', () => {
    const { queryByText } = render(<TaskCard task={BASE_TASK} onPress={() => {}} />);
    expect(queryByText(/korlap · Andi/)).toBeNull();
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

  describe('status pill labels (taskPill)', () => {
    // StatusPill renders the label as its text node (uppercase is CSS-only).
    const cases: Array<[Task['status'], string]> = [
      ['pending', 'Menunggu'],
      ['assigned', 'Siap mulai'],
      ['accepted', 'Siap mulai'],
      ['declined', 'Ditolak'],
      ['in_progress', 'Berjalan'],
      ['completed', 'Menunggu verifikasi'],
      ['verified', 'Terverifikasi'],
      ['revision_needed', 'Revisi'],
    ];

    test.each(cases)('status %s → pill "%s"', (status, label) => {
      const { getByText } = render(
        <TaskCard task={{ ...BASE_TASK, status } as any} onPress={() => {}} />
      );
      expect(getByText(label)).toBeTruthy();
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
