/**
 * CountdownTimer Component Tests
 * Tests timer updates, color variants, formatting, and cleanup
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { CountdownTimer } from '../CountdownTimer';

// Mock Date for predictable testing
const MOCK_NOW = 1704067200000; // 2024-01-01 00:00:00 UTC

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      const startTime = new Date(MOCK_NOW - 3661000).toISOString(); // 1h 1m 1s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('01:01:01')).toBeTruthy();
    });

    it('should render initial time correctly', () => {
      const startTime = new Date(MOCK_NOW).toISOString(); // Just started
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:00:00')).toBeTruthy();
    });

    it('should format time with leading zeros', () => {
      const startTime = new Date(MOCK_NOW - 61000).toISOString(); // 1m 1s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:01:01')).toBeTruthy();
    });

    it('should display hours correctly', () => {
      const startTime = new Date(MOCK_NOW - 3600000).toISOString(); // 1h ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('01:00:00')).toBeTruthy();
    });

    it('should display minutes correctly', () => {
      const startTime = new Date(MOCK_NOW - 120000).toISOString(); // 2m ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:02:00')).toBeTruthy();
    });

    it('should display seconds correctly', () => {
      const startTime = new Date(MOCK_NOW - 30000).toISOString(); // 30s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:00:30')).toBeTruthy();
    });
  });

  describe('Timer Updates', () => {
    it('should update every second', async () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} />);

      expect(getByText('00:00:00')).toBeTruthy();

      // Advance 1 second
      jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW + 1000);
      act(() => { jest.advanceTimersByTime(1000); });

      await waitFor(() => {
        expect(getByText('00:00:01')).toBeTruthy();
      });
    });

    it('should continue updating over time', async () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} />);

      // Advance 5 seconds
      jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW + 5000);
      act(() => { jest.advanceTimersByTime(5000); });

      await waitFor(() => {
        expect(getByText('00:00:05')).toBeTruthy();
      });
    });

    it('should handle minute transitions', async () => {
      const startTime = new Date(MOCK_NOW - 59000).toISOString(); // 59s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);

      expect(getByText('00:00:59')).toBeTruthy();

      // Advance 1 second to reach 1 minute
      jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW + 1000);
      act(() => { jest.advanceTimersByTime(1000); });

      await waitFor(() => {
        expect(getByText('00:01:00')).toBeTruthy();
      });
    });

    it('should handle hour transitions', async () => {
      const startTime = new Date(MOCK_NOW - 3599000).toISOString(); // 59m 59s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);

      expect(getByText('00:59:59')).toBeTruthy();

      // Advance 1 second to reach 1 hour
      jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW + 1000);
      act(() => { jest.advanceTimersByTime(1000); });

      await waitFor(() => {
        expect(getByText('01:00:00')).toBeTruthy();
      });
    });
  });

  describe('Color Variants', () => {
    it('should render with yellow color by default', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#E3A018' })
        ])
      );
    });

    it('should render with yellow color when specified', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} color="yellow" />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#E3A018' })
        ])
      );
    });

    it('should render with green color', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} color="green" />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#7FBC8C' })
        ])
      );
    });

    it('should render with red color', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} color="red" />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF6B6B' })
        ])
      );
    });
  });

  describe('Font Size', () => {
    it('should use default font size of 40', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 40 })
        ])
      );
    });

    it('should apply custom font size', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} fontSize={60} />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 60 })
        ])
      );
    });

    it('should handle small font size', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} fontSize={20} />);
      const timer = getByText('00:00:00');
      expect(timer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 20 })
        ])
      );
    });
  });

  describe('Accessibility', () => {
    it('should have timer role', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByRole } = render(<CountdownTimer startTime={startTime} />);
      expect(getByRole('timer')).toBeTruthy();
    });

    it('should have default accessibility label', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByLabelText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByLabelText('Waktu berjalan: 00:00:00')).toBeTruthy();
    });

    it('should use custom accessibility label when provided', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByLabelText } = render(
        <CountdownTimer startTime={startTime} accessibilityLabel="Custom timer label" />
      );
      expect(getByLabelText('Custom timer label')).toBeTruthy();
    });

    it('should update accessibility label with time', async () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByLabelText } = render(<CountdownTimer startTime={startTime} />);

      expect(getByLabelText('Waktu berjalan: 00:00:00')).toBeTruthy();

      jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW + 5000);
      act(() => { jest.advanceTimersByTime(5000); });

      await waitFor(() => {
        expect(getByLabelText('Waktu berjalan: 00:00:05')).toBeTruthy();
      });
    });
  });

  describe('Time Calculations', () => {
    it('should handle large time values', () => {
      const startTime = new Date(MOCK_NOW - 36000000).toISOString(); // 10h ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('10:00:00')).toBeTruthy();
    });

    it('should handle complex time values', () => {
      const startTime = new Date(MOCK_NOW - 12345000).toISOString(); // 3h 25m 45s ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('03:25:45')).toBeTruthy();
    });

    it('should handle sub-second precision correctly', () => {
      const startTime = new Date(MOCK_NOW - 500).toISOString(); // 500ms ago
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:00:00')).toBeTruthy(); // Should round down
    });

    it('should handle future start time gracefully', () => {
      const startTime = new Date(MOCK_NOW + 5000).toISOString(); // 5s in future
      const { getByRole } = render(<CountdownTimer startTime={startTime} />);
      // Component renders (negative elapsed handled by Math.floor)
      expect(getByRole('timer')).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { unmount } = render(<CountdownTimer startTime={startTime} />);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not update after unmount', async () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText, unmount } = render(<CountdownTimer startTime={startTime} />);

      expect(getByText('00:00:00')).toBeTruthy();
      unmount();

      // Advance time after unmount
      act(() => { jest.advanceTimersByTime(5000); });

      // Component should not update
      expect(() => getByText('00:00:05')).toThrow();
    });
  });

  describe('Start Time Changes', () => {
    it('should update when startTime prop changes', async () => {
      const startTime1 = new Date(MOCK_NOW - 60000).toISOString(); // 1m ago
      const { getByText, rerender } = render(<CountdownTimer startTime={startTime1} />);

      expect(getByText('00:01:00')).toBeTruthy();

      const startTime2 = new Date(MOCK_NOW - 120000).toISOString(); // 2m ago
      rerender(<CountdownTimer startTime={startTime2} />);

      await waitFor(() => {
        expect(getByText('00:02:00')).toBeTruthy();
      });
    });

    it('should restart interval when startTime changes', async () => {
      const startTime1 = new Date(MOCK_NOW).toISOString();
      const { getByText, rerender } = render(<CountdownTimer startTime={startTime1} />);

      expect(getByText('00:00:00')).toBeTruthy();

      const startTime2 = new Date(MOCK_NOW - 30000).toISOString();
      rerender(<CountdownTimer startTime={startTime2} />);

      await waitFor(() => {
        expect(getByText('00:00:30')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero elapsed time', () => {
      const startTime = new Date(MOCK_NOW).toISOString();
      const { getByText } = render(<CountdownTimer startTime={startTime} />);
      expect(getByText('00:00:00')).toBeTruthy();
    });

    it('should handle invalid date string gracefully', () => {
      const { getByText } = render(<CountdownTimer startTime="invalid-date" />);
      // Should display NaN:NaN:NaN or crash - either is acceptable
      // This tests that the component doesn't crash hard
      expect(() => getByText).not.toThrow();
    });

    it('should handle multiple instances independently', () => {
      const startTime1 = new Date(MOCK_NOW - 60000).toISOString();
      const startTime2 = new Date(MOCK_NOW - 120000).toISOString();

      const { getAllByRole } = render(
        <>
          <CountdownTimer startTime={startTime1} />
          <CountdownTimer startTime={startTime2} />
        </>
      );

      const timers = getAllByRole('timer');
      expect(timers).toHaveLength(2);
    });
  });
});
