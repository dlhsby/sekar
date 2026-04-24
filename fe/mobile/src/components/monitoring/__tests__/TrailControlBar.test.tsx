/**
 * TrailControlBar Component Tests
 * Phase 2D: Date navigation bar for the location trail viewer.
 *
 * NOTE: Run with TZ=UTC for deterministic date arithmetic:
 *   TZ=UTC npx jest TrailControlBar.test.tsx
 * The component uses local-midnight Date construction + UTC ISO output, so the
 * results shift in non-UTC zones.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TrailControlBar } from '../TrailControlBar';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: 'icon', ...props }, props.name);
});

// ─── Fixed "today" ────────────────────────────────────────────────────────────

const TODAY = '2026-03-08';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Prop factory ─────────────────────────────────────────────────────────────

const makeProps = (
  overrides?: Partial<React.ComponentProps<typeof TrailControlBar>>,
) => ({
  date: '2026-03-06',
  onDateChange: jest.fn(),
  onShiftChange: jest.fn(),
  hideOthers: false,
  onHideOthersToggle: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrailControlBar', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── 1. Formatted date display ────────────────────────────────────────────────

  describe('date display', () => {
    it('renders the date in Indonesian locale', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-03-06' })} />);
      expect(getByText('6 Mar 2026')).toBeTruthy();
    });

    it('updates when a different date prop is supplied', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-01-15' })} />);
      expect(getByText('15 Jan 2026')).toBeTruthy();
    });
  });

  // ── 2. Previous day button ───────────────────────────────────────────────────

  describe('previous day navigation', () => {
    it('calls onDateChange with the previous day', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-03-06', onDateChange })} />);

      fireEvent.press(getByText('chevron-left'));

      expect(onDateChange).toHaveBeenCalledTimes(1);
      expect(onDateChange).toHaveBeenCalledWith('2026-03-05');
    });

    it('navigates correctly across a month boundary (March 1 → Feb 28)', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-03-01', onDateChange })} />);

      fireEvent.press(getByText('chevron-left'));

      expect(onDateChange).toHaveBeenCalledWith('2026-02-28');
    });

    it('navigates correctly across a year boundary (Jan 1 → Dec 31)', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-01-01', onDateChange })} />);

      fireEvent.press(getByText('chevron-left'));

      expect(onDateChange).toHaveBeenCalledWith('2025-12-31');
    });

    it('handles leap-year February (March 1 2024 → Feb 29 2024)', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2024-03-01', onDateChange })} />);

      fireEvent.press(getByText('chevron-left'));

      expect(onDateChange).toHaveBeenCalledWith('2024-02-29');
    });
  });

  // ── 3. Next day button ───────────────────────────────────────────────────────

  describe('next day navigation', () => {
    it('calls onDateChange with the next day when date is before today', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-03-06', onDateChange })} />);

      fireEvent.press(getByText('chevron-right'));

      expect(onDateChange).toHaveBeenCalledTimes(1);
      expect(onDateChange).toHaveBeenCalledWith('2026-03-07');
    });

    it('calls onDateChange when date is one day before today (next day = today)', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-03-07', onDateChange })} />);

      fireEvent.press(getByText('chevron-right'));

      expect(onDateChange).toHaveBeenCalledWith('2026-03-08');
    });

    it('calls onDateChange correctly across a month boundary (Feb 27 → Feb 28)', () => {
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-02-27', onDateChange })} />);

      fireEvent.press(getByText('chevron-right'));

      expect(onDateChange).toHaveBeenCalledWith('2026-02-28');
    });
  });

  // ── 4. Next day button disabled when date is today ───────────────────────────

  describe('next day button disabled state', () => {
    it('does not call onDateChange when date equals today', () => {
      // next day would exceed today so getNextDay returns null → button disabled
      const onDateChange = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ date: TODAY, onDateChange })} />);

      fireEvent.press(getByText('chevron-right'));

      expect(onDateChange).not.toHaveBeenCalled();
    });

    it('sets disabled={true} on the next-day TouchableOpacity', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ date: TODAY })} />);
      const iconEl = getByText('chevron-right');

      // Walk up the element tree to find the ancestor with a disabled prop
      let node = iconEl.parent;
      while (node && node.props.disabled === undefined) {
        node = node.parent;
      }

      expect(node?.props.disabled).toBe(true);
    });
  });

  // ── 5. Hide/show others toggle ───────────────────────────────────────────────

  describe('hide/show others toggle', () => {
    it('shows "Sembunyikan lainnya" when hideOthers is false', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ hideOthers: false })} />);
      expect(getByText('Sembunyikan lainnya')).toBeTruthy();
    });

    it('shows "Tampilkan lainnya" when hideOthers is true', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ hideOthers: true })} />);
      expect(getByText('Tampilkan lainnya')).toBeTruthy();
    });

    it('calls onHideOthersToggle when pressed (hideOthers false)', () => {
      const onHideOthersToggle = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ hideOthers: false, onHideOthersToggle })} />);

      fireEvent.press(getByText('Sembunyikan lainnya'));

      expect(onHideOthersToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onHideOthersToggle when pressed (hideOthers true)', () => {
      const onHideOthersToggle = jest.fn();
      const { getByText } = render(<TrailControlBar {...makeProps({ hideOthers: true, onHideOthersToggle })} />);

      fireEvent.press(getByText('Tampilkan lainnya'));

      expect(onHideOthersToggle).toHaveBeenCalledTimes(1);
    });
  });

  // ── 6. Close button ──────────────────────────────────────────────────────────

  describe('close button', () => {
    it('calls onClose when pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(<TrailControlBar {...makeProps({ onClose })} />);

      fireEvent.press(getByLabelText('Tutup trail'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('has accessibilityRole "button"', () => {
      const { getByLabelText } = render(<TrailControlBar {...makeProps()} />);
      expect(getByLabelText('Tutup trail').props.accessibilityRole).toBe('button');
    });
  });

  // ── 7. formatDisplayDate edge cases ─────────────────────────────────────────

  describe('formatDisplayDate', () => {
    it('formats January 1st correctly', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2026-01-01' })} />);
      expect(getByText('1 Jan 2026')).toBeTruthy();
    });

    it('formats December 31st correctly', () => {
      const { getByText } = render(<TrailControlBar {...makeProps({ date: '2025-12-31' })} />);
      expect(getByText('31 Des 2025')).toBeTruthy();
    });
  });
});
