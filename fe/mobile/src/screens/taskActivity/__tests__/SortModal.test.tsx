import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortModal } from '../../../components/modals/SortModal';

const BASE_PROPS = {
  visible: true,
  title: 'URUTKAN TUGAS',
  options: [
    { key: 'created_at_desc', label: 'Terbaru (default)' },
    { key: 'created_at_asc', label: 'Terlama' },
    { key: 'deadline_asc', label: 'Deadline Terdekat' },
    { key: 'priority_desc', label: 'Prioritas Tertinggi' },
  ],
  selectedOption: 'created_at_desc',
  onClose: jest.fn(),
  onSelect: jest.fn(),
};

describe('SortModal (shared)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render content when not visible', () => {
    const { queryByText } = render(<SortModal {...BASE_PROPS} visible={false} />);
    expect(queryByText('URUTKAN TUGAS')).toBeNull();
  });

  describe('tasks sort options', () => {
    it('renders sort title', () => {
      const { getByText } = render(<SortModal {...BASE_PROPS} />);
      expect(getByText('URUTKAN TUGAS')).toBeTruthy();
    });

    it('renders all 4 task sort options', () => {
      const { getByText } = render(<SortModal {...BASE_PROPS} />);
      expect(getByText('Terbaru (default)')).toBeTruthy();
      expect(getByText('Terlama')).toBeTruthy();
      expect(getByText('Deadline Terdekat')).toBeTruthy();
      expect(getByText('Prioritas Tertinggi')).toBeTruthy();
    });

    it('calls onSelect and onClose when option selected', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <SortModal {...BASE_PROPS} onSelect={onSelect} onClose={onClose} />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelect).toHaveBeenCalledWith('created_at_asc');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} onClose={onClose} />
      );
      fireEvent.press(getByLabelText('Tutup'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('highlights the active sort option', () => {
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} selectedOption="deadline_asc" />
      );
      const option = getByLabelText('Deadline Terdekat');
      expect(option.props.accessibilityState?.selected).toBe(true);
    });

    it('non-active option is not selected', () => {
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} selectedOption="deadline_asc" />
      );
      const option = getByLabelText('Terbaru (default)');
      expect(option.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('activities sort options', () => {
    const activityProps = {
      ...BASE_PROPS,
      title: 'URUTKAN AKTIVITAS',
      options: [
        { key: 'created_at_desc', label: 'Terbaru (default)' },
        { key: 'created_at_asc', label: 'Terlama' },
      ],
      selectedOption: 'created_at_desc',
    };

    it('renders activities sort title', () => {
      const { getByText } = render(<SortModal {...activityProps} />);
      expect(getByText('URUTKAN AKTIVITAS')).toBeTruthy();
    });

    it('renders only 2 activity sort options', () => {
      const { getByText, queryByText } = render(<SortModal {...activityProps} />);
      expect(getByText('Terbaru (default)')).toBeTruthy();
      expect(getByText('Terlama')).toBeTruthy();
      expect(queryByText('Deadline Terdekat')).toBeNull();
      expect(queryByText('Prioritas Tertinggi')).toBeNull();
    });

    it('calls onSelect when option selected', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <SortModal {...activityProps} onSelect={onSelect} />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelect).toHaveBeenCalledWith('created_at_asc');
    });

    it('highlights the active activity sort option', () => {
      const { getByLabelText } = render(
        <SortModal {...activityProps} selectedOption="created_at_asc" />
      );
      expect(getByLabelText('Terlama').props.accessibilityState?.selected).toBe(true);
    });
  });
});
