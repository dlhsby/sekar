import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortModal } from '../components/SortModal';

const BASE_PROPS = {
  visible: true,
  activeTab: 'tasks' as const,
  taskSort: 'created_at_desc' as const,
  activitySort: 'created_at_desc' as const,
  onClose: jest.fn(),
  onSelectTaskSort: jest.fn(),
  onSelectActivitySort: jest.fn(),
};

describe('SortModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render content when not visible', () => {
    const { queryByText } = render(<SortModal {...BASE_PROPS} visible={false} />);
    expect(queryByText('URUTKAN TUGAS')).toBeNull();
  });

  describe('tasks tab', () => {
    it('renders tasks sort title', () => {
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

    it('calls onSelectTaskSort and onClose when option selected', () => {
      const onSelectTaskSort = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <SortModal {...BASE_PROPS} onSelectTaskSort={onSelectTaskSort} onClose={onClose} />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelectTaskSort).toHaveBeenCalledWith('created_at_asc');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onSelectActivitySort when on tasks tab', () => {
      const onSelectActivitySort = jest.fn();
      const { getByText } = render(
        <SortModal {...BASE_PROPS} onSelectActivitySort={onSelectActivitySort} />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelectActivitySort).not.toHaveBeenCalled();
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} onClose={onClose} />
      );
      fireEvent.press(getByLabelText('Tutup modal urutan'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('highlights the active sort option', () => {
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} taskSort="deadline_asc" />
      );
      const option = getByLabelText('Deadline Terdekat');
      expect(option.props.accessibilityState?.selected).toBe(true);
    });

    it('non-active option is not selected', () => {
      const { getByLabelText } = render(
        <SortModal {...BASE_PROPS} taskSort="deadline_asc" />
      );
      const option = getByLabelText('Terbaru (default)');
      expect(option.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('activities tab', () => {
    const activitiesProps = { ...BASE_PROPS, activeTab: 'activities' as const };

    it('renders activities sort title', () => {
      const { getByText } = render(<SortModal {...activitiesProps} />);
      expect(getByText('URUTKAN AKTIVITAS')).toBeTruthy();
    });

    it('renders only 2 activity sort options', () => {
      const { getByText, queryByText } = render(<SortModal {...activitiesProps} />);
      expect(getByText('Terbaru (default)')).toBeTruthy();
      expect(getByText('Terlama')).toBeTruthy();
      expect(queryByText('Deadline Terdekat')).toBeNull();
      expect(queryByText('Prioritas Tertinggi')).toBeNull();
    });

    it('calls onSelectActivitySort and onClose when option selected', () => {
      const onSelectActivitySort = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <SortModal
          {...activitiesProps}
          onSelectActivitySort={onSelectActivitySort}
          onClose={onClose}
        />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelectActivitySort).toHaveBeenCalledWith('created_at_asc');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onSelectTaskSort when on activities tab', () => {
      const onSelectTaskSort = jest.fn();
      const { getByText } = render(
        <SortModal {...activitiesProps} onSelectTaskSort={onSelectTaskSort} />
      );
      fireEvent.press(getByText('Terlama'));
      expect(onSelectTaskSort).not.toHaveBeenCalled();
    });

    it('highlights the active activity sort option', () => {
      const { getByLabelText } = render(
        <SortModal {...activitiesProps} activitySort="created_at_asc" />
      );
      expect(getByLabelText('Terlama').props.accessibilityState?.selected).toBe(true);
    });
  });
});
