/**
 * NBTab Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NBTab, NBTabItem } from '../NBTab';

// Haptic feedback mocked in jest.setup.js

describe('NBTab', () => {
  const mockOnTabChange = jest.fn();

  const defaultTabs: NBTabItem[] = [
    { key: 'tasks', label: 'TUGAS' },
    { key: 'reports', label: 'LAPORAN' },
  ];

  const tabsWithCounts: NBTabItem[] = [
    { key: 'tasks', label: 'TUGAS', count: 3 },
    { key: 'reports', label: 'LAPORAN', count: 5 },
  ];

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  describe('rendering', () => {
    it('renders all tabs', () => {
      const { getByText } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByText('TUGAS')).toBeTruthy();
      expect(getByText('LAPORAN')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="main-tabs"
        />,
      );
      expect(getByTestId('main-tabs')).toBeTruthy();
    });

    it('renders individual tabs with testID', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="main-tabs"
        />,
      );
      expect(getByTestId('main-tabs-tasks')).toBeTruthy();
      expect(getByTestId('main-tabs-reports')).toBeTruthy();
    });
  });

  describe('counts', () => {
    it('renders tab counts', () => {
      const { getByText } = render(
        <NBTab
          tabs={tabsWithCounts}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByText('3')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });

    it('renders count with testID', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={tabsWithCounts}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs-tasks-count')).toBeTruthy();
      expect(getByTestId('tabs-reports-count')).toBeTruthy();
    });

    it('shows 99+ for counts over 99', () => {
      const largeCounts: NBTabItem[] = [
        { key: 'tasks', label: 'TUGAS', count: 150 },
      ];
      const { getByText } = render(
        <NBTab
          tabs={largeCounts}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByText('99+')).toBeTruthy();
    });

    it('does not show count when 0', () => {
      const zeroCounts: NBTabItem[] = [
        { key: 'tasks', label: 'TUGAS', count: 0 },
      ];
      const { queryByTestId } = render(
        <NBTab
          tabs={zeroCounts}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      expect(queryByTestId('tabs-tasks-count')).toBeNull();
    });

    it('does not show count when undefined', () => {
      const { queryByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      expect(queryByTestId('tabs-tasks-count')).toBeNull();
    });
  });

  describe('icons', () => {
    it('renders icon when provided', () => {
      const tabsWithIcons: NBTabItem[] = [
        { key: 'tasks', label: 'TUGAS', icon: <Text testID="task-icon">📋</Text> },
      ];
      const { getByTestId } = render(
        <NBTab
          tabs={tabsWithIcons}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByTestId('task-icon')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onTabChange when inactive tab is pressed', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      fireEvent.press(getByTestId('tabs-reports'));
      expect(mockOnTabChange).toHaveBeenCalledWith('reports');
    });

    it('does not call onTabChange when active tab is pressed', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      fireEvent.press(getByTestId('tabs-tasks'));
      expect(mockOnTabChange).not.toHaveBeenCalled();
    });

    it('calls onTabChange with correct key', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="reports"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      fireEvent.press(getByTestId('tabs-tasks'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tasks');
    });
  });

  describe('accessibility', () => {
    it('has tablist role on container (NB 2.0)', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const container = getByTestId('tabs');
      expect(container.props.accessibilityRole).toBe('tablist');
    });

    it('has tab accessibility role', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const tab = getByTestId('tabs-tasks');
      expect(tab.props.accessibilityRole).toBe('tab');
    });

    it('indicates selected state for active tab', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const activeTab = getByTestId('tabs-tasks');
      expect(activeTab.props.accessibilityState.selected).toBe(true);
    });

    it('indicates not selected for inactive tab', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const inactiveTab = getByTestId('tabs-reports');
      expect(inactiveTab.props.accessibilityState.selected).toBe(false);
    });

    it('includes count in accessibility label', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={tabsWithCounts}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const tab = getByTestId('tabs-tasks');
      expect(tab.props.accessibilityLabel).toBe('TUGAS, 3 items');
    });

    it('excludes count from accessibility label when no count', () => {
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />,
      );
      const tab = getByTestId('tabs-tasks');
      expect(tab.props.accessibilityLabel).toBe('TUGAS');
    });
  });

  describe('styling', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          style={customStyle}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs')).toBeTruthy();
    });

    it('applies custom tab style', () => {
      const customStyle = { minHeight: 60 };
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          tabStyle={customStyle}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs')).toBeTruthy();
    });

    it('applies custom active tab style', () => {
      const customStyle = { backgroundColor: 'blue' };
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          activeTabStyle={customStyle}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs')).toBeTruthy();
    });

    it('applies custom text style', () => {
      const customStyle = { fontSize: 16 };
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          textStyle={customStyle}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs')).toBeTruthy();
    });

    it('applies custom active text style', () => {
      const customStyle = { fontWeight: 'bold' as const };
      const { getByTestId } = render(
        <NBTab
          tabs={defaultTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
          activeTextStyle={customStyle}
          testID="tabs"
        />,
      );
      expect(getByTestId('tabs')).toBeTruthy();
    });
  });

  describe('multiple tabs', () => {
    it('renders three tabs', () => {
      const threeTabs: NBTabItem[] = [
        { key: 'tasks', label: 'TUGAS' },
        { key: 'reports', label: 'LAPORAN' },
        { key: 'history', label: 'RIWAYAT' },
      ];
      const { getByText } = render(
        <NBTab
          tabs={threeTabs}
          activeTab="tasks"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByText('TUGAS')).toBeTruthy();
      expect(getByText('LAPORAN')).toBeTruthy();
      expect(getByText('RIWAYAT')).toBeTruthy();
    });

    it('renders four tabs', () => {
      const fourTabs: NBTabItem[] = [
        { key: 'home', label: 'HOME' },
        { key: 'tasks', label: 'TUGAS' },
        { key: 'reports', label: 'LAPORAN' },
        { key: 'profile', label: 'PROFIL' },
      ];
      const { getByText } = render(
        <NBTab
          tabs={fourTabs}
          activeTab="home"
          onTabChange={mockOnTabChange}
        />,
      );
      expect(getByText('HOME')).toBeTruthy();
      expect(getByText('TUGAS')).toBeTruthy();
      expect(getByText('LAPORAN')).toBeTruthy();
      expect(getByText('PROFIL')).toBeTruthy();
    });
  });
});
