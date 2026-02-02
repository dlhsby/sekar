/**
 * SkeletonLoader Component Tests
 * Tests shimmer animation, variants, memory cleanup, and accessibility
 */

// Alert mocked globally in jest.setup.js

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import {
  SkeletonLoader,
  SkeletonCard,
  SkeletonList,
  SkeletonReportItem,
  SkeletonSummaryCard,
} from '../SkeletonLoader';

describe('SkeletonLoader Component', () => {
  // Mock Animated.loop and timing to track animation lifecycle
  let mockStop: jest.Mock;
  let mockStart: jest.Mock;

  beforeEach(() => {
    mockStop = jest.fn();
    mockStart = jest.fn();

    jest.spyOn(Animated, 'loop').mockReturnValue({
      start: mockStart,
      stop: mockStop,
      reset: jest.fn(),
    } as any);

    jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Base SkeletonLoader', () => {
    it('should render with default props', () => {
      const { getByLabelText } = render(<SkeletonLoader />);
      expect(getByLabelText('Memuat konten')).toBeTruthy();
    });

    it('should render with custom width and height', () => {
      const { getByLabelText } = render(
        <SkeletonLoader width={200} height={40} />
      );
      const skeleton = getByLabelText('Memuat konten');
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 200,
            height: 40,
          }),
        ])
      );
    });

    it('should render with percentage width', () => {
      const { getByLabelText } = render(
        <SkeletonLoader width="50%" height={20} />
      );
      const skeleton = getByLabelText('Memuat konten');
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '50%',
            height: 20,
          }),
        ])
      );
    });

    it('should render with custom borderRadius', () => {
      const { getByLabelText } = render(
        <SkeletonLoader width={100} height={100} borderRadius={50} />
      );
      const skeleton = getByLabelText('Memuat konten');
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 50,
          }),
        ])
      );
    });

    it('should start animation on mount', () => {
      render(<SkeletonLoader />);
      expect(Animated.loop).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('should stop animation on unmount', () => {
      const { unmount } = render(<SkeletonLoader />);
      unmount();
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('should have accessibility progressbar role', () => {
      const { getByLabelText } = render(<SkeletonLoader />);
      const skeleton = getByLabelText('Memuat konten');
      expect(skeleton.props.accessibilityRole).toBe('progressbar');
    });

    it('should apply custom styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByLabelText } = render(
        <SkeletonLoader style={customStyle} />
      );
      const skeleton = getByLabelText('Memuat konten');
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('should not have memory leaks with multiple instances', () => {
      const { unmount: unmount1 } = render(<SkeletonLoader />);
      const { unmount: unmount2 } = render(<SkeletonLoader />);
      const { unmount: unmount3 } = render(<SkeletonLoader />);

      unmount1();
      unmount2();
      unmount3();

      // Each instance should stop its animation
      expect(mockStop).toHaveBeenCalledTimes(3);
    });
  });

  describe('SkeletonCard', () => {
    it('should render card layout', () => {
      const { UNSAFE_getAllByType } = render(<SkeletonCard />);
      // SkeletonCard contains multiple SkeletonLoader instances
      const skeletons = UNSAFE_getAllByType(SkeletonLoader);
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should render with custom style', () => {
      const customStyle = { marginBottom: 20 };
      const { getByTestId } = render(
        <SkeletonCard style={{ ...customStyle, testID: 'card' } as any} />
      );
      // Check that component accepts and applies style prop
      expect(() => render(<SkeletonCard style={customStyle} />)).not.toThrow();
    });

    it('should render title skeleton', () => {
      const { getAllByLabelText } = render(<SkeletonCard />);
      const skeletons = getAllByLabelText('Memuat konten');
      // SkeletonCard should have multiple skeleton elements
      expect(skeletons.length).toBeGreaterThan(2);
    });

    it('should render action buttons skeleton', () => {
      const { getAllByLabelText } = render(<SkeletonCard />);
      const skeletons = getAllByLabelText('Memuat konten');
      // Card has title, lines, and button skeletons
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('SkeletonList', () => {
    it('should render default 3 items', () => {
      const { getAllByLabelText } = render(<SkeletonList />);
      const skeletons = getAllByLabelText('Memuat konten');
      // 3 items × (avatar + title + subtitle) = 9 skeleton elements
      expect(skeletons.length).toBe(9);
    });

    it('should render custom count of items', () => {
      const { getAllByLabelText } = render(<SkeletonList count={5} />);
      const skeletons = getAllByLabelText('Memuat konten');
      // 5 items × 3 skeletons per item = 15
      expect(skeletons.length).toBe(15);
    });

    it('should render single item', () => {
      const { getAllByLabelText } = render(<SkeletonList count={1} />);
      const skeletons = getAllByLabelText('Memuat konten');
      // 1 item × 3 skeletons = 3
      expect(skeletons.length).toBe(3);
    });

    it('should render no items when count is 0', () => {
      const { queryAllByLabelText } = render(<SkeletonList count={0} />);
      const skeletons = queryAllByLabelText('Memuat konten');
      expect(skeletons.length).toBe(0);
    });

    it('should render with custom itemHeight', () => {
      const { getAllByLabelText } = render(<SkeletonList itemHeight={100} />);
      // Component should render without errors
      expect(getAllByLabelText('Memuat konten').length).toBeGreaterThan(0);
    });

    it('should render with custom style', () => {
      const customStyle = { padding: 20 };
      expect(() => render(<SkeletonList style={customStyle} />)).not.toThrow();
    });
  });

  describe('SkeletonReportItem', () => {
    it('should render report item skeleton', () => {
      const { getAllByLabelText } = render(<SkeletonReportItem />);
      const skeletons = getAllByLabelText('Memuat konten');
      // Header (2) + description (1) + metadata (1) = 4 skeleton elements
      expect(skeletons.length).toBe(4);
    });

    it('should render header section', () => {
      const { getAllByLabelText } = render(<SkeletonReportItem />);
      const skeletons = getAllByLabelText('Memuat konten');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render multiple report items', () => {
      const { getAllByLabelText } = render(
        <>
          <SkeletonReportItem />
          <SkeletonReportItem />
          <SkeletonReportItem />
        </>
      );
      const skeletons = getAllByLabelText('Memuat konten');
      // 3 items × 4 skeletons per item = 12
      expect(skeletons.length).toBe(12);
    });
  });

  describe('SkeletonSummaryCard', () => {
    it('should render summary card skeleton', () => {
      const { getAllByLabelText } = render(<SkeletonSummaryCard />);
      const skeletons = getAllByLabelText('Memuat konten');
      // Title (1) + 2 items × (icon + label) = 5 skeleton elements
      expect(skeletons.length).toBe(5);
    });

    it('should render title skeleton', () => {
      const { getAllByLabelText } = render(<SkeletonSummaryCard />);
      const skeletons = getAllByLabelText('Memuat konten');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render summary items', () => {
      const { getAllByLabelText } = render(<SkeletonSummaryCard />);
      const skeletons = getAllByLabelText('Memuat konten');
      // Should have multiple skeleton elements for the summary items
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('should render multiple summary cards', () => {
      const { getAllByLabelText } = render(
        <>
          <SkeletonSummaryCard />
          <SkeletonSummaryCard />
        </>
      );
      const skeletons = getAllByLabelText('Memuat konten');
      // 2 cards × 5 skeletons per card = 10
      expect(skeletons.length).toBe(10);
    });
  });

  describe('Animation Lifecycle', () => {
    it('should create unique animation per instance', () => {
      render(
        <>
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </>
      );

      // Each skeleton should have its own animation
      expect(mockStart).toHaveBeenCalledTimes(3);
      expect(Animated.loop).toHaveBeenCalledTimes(3);
    });

    it('should properly cleanup animations', () => {
      const { rerender, unmount } = render(<SkeletonLoader />);

      // Animation should start on mount
      expect(mockStart).toHaveBeenCalledTimes(1);

      // Re-render shouldn't restart animation
      rerender(<SkeletonLoader />);
      expect(mockStart).toHaveBeenCalledTimes(1);

      // Unmount should stop animation
      unmount();
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount: unmount1 } = render(<SkeletonLoader />);
      unmount1();

      const { unmount: unmount2 } = render(<SkeletonLoader />);
      unmount2();

      const { unmount: unmount3 } = render(<SkeletonLoader />);
      unmount3();

      // Each mount should start animation, each unmount should stop it
      expect(mockStart).toHaveBeenCalledTimes(3);
      expect(mockStop).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero width', () => {
      const { getByLabelText } = render(<SkeletonLoader width={0} height={20} />);
      expect(getByLabelText('Memuat konten')).toBeTruthy();
    });

    it('should handle zero height', () => {
      const { getByLabelText } = render(<SkeletonLoader width={100} height={0} />);
      expect(getByLabelText('Memuat konten')).toBeTruthy();
    });

    it('should handle very large dimensions', () => {
      const { getByLabelText } = render(
        <SkeletonLoader width={10000} height={10000} />
      );
      expect(getByLabelText('Memuat konten')).toBeTruthy();
    });

    it('should handle empty SkeletonList', () => {
      const { queryAllByLabelText } = render(<SkeletonList count={0} />);
      const skeletons = queryAllByLabelText('Memuat konten');
      expect(skeletons.length).toBe(0);
    });

    it('should handle large SkeletonList count', () => {
      const { getAllByLabelText } = render(<SkeletonList count={100} />);
      const skeletons = getAllByLabelText('Memuat konten');
      expect(skeletons.length).toBe(300); // 100 items × 3 skeletons
    });
  });
});
