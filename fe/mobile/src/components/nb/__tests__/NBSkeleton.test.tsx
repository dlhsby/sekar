/**
 * NBSkeleton Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { NBSkeleton } from '../NBSkeleton';

describe('NBSkeleton', () => {
  describe('rendering', () => {
    it('renders single skeleton by default', () => {
      const { getByTestId } = render(<NBSkeleton testID="skeleton" />);
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders multiple skeletons with count', () => {
      const { getByTestId } = render(<NBSkeleton count={3} testID="skeleton" />);
      expect(getByTestId('skeleton-0')).toBeTruthy();
      expect(getByTestId('skeleton-1')).toBeTruthy();
      expect(getByTestId('skeleton-2')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(<NBSkeleton testID="test-skeleton" />);
      expect(getByTestId('test-skeleton')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders text variant', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="text" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders card variant', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="card" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders avatar variant', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="avatar" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders list variant', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="list" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders button variant', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="button" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });
  });

  describe('custom dimensions', () => {
    it('renders with custom width (number)', () => {
      const { getByTestId } = render(
        <NBSkeleton width={200} testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders with custom width (string)', () => {
      const { getByTestId } = render(
        <NBSkeleton width="50%" testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders with custom height', () => {
      const { getByTestId } = render(
        <NBSkeleton height={100} testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('renders with both custom width and height', () => {
      const { getByTestId } = render(
        <NBSkeleton width={200} height={100} testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });
  });

  describe('count variations', () => {
    it('renders single skeleton when count is 1', () => {
      const { getByTestId, queryByTestId } = render(
        <NBSkeleton count={1} testID="skeleton" />,
      );
      expect(getByTestId('skeleton-0')).toBeTruthy();
      expect(queryByTestId('skeleton-1')).toBeNull();
    });

    it('renders two skeletons when count is 2', () => {
      const { getByTestId } = render(<NBSkeleton count={2} testID="skeleton" />);
      expect(getByTestId('skeleton-0')).toBeTruthy();
      expect(getByTestId('skeleton-1')).toBeTruthy();
    });

    it('renders five skeletons when count is 5', () => {
      const { getByTestId } = render(<NBSkeleton count={5} testID="skeleton" />);
      expect(getByTestId('skeleton-0')).toBeTruthy();
      expect(getByTestId('skeleton-1')).toBeTruthy();
      expect(getByTestId('skeleton-2')).toBeTruthy();
      expect(getByTestId('skeleton-3')).toBeTruthy();
      expect(getByTestId('skeleton-4')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBSkeleton style={customStyle} testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });
  });

  describe('accessibility (NB 2.0)', () => {
    it('has accessibilityRole progressbar', () => {
      const { getByTestId } = render(<NBSkeleton testID="skeleton" />);
      const skeleton = getByTestId('skeleton');
      expect(skeleton.props.accessibilityRole).toBe('progressbar');
    });

    it('has accessibilityState busy true', () => {
      const { getByTestId } = render(<NBSkeleton testID="skeleton" />);
      const skeleton = getByTestId('skeleton');
      expect(skeleton.props.accessibilityState).toEqual({ busy: true });
    });

    it('has accessibilityLabel', () => {
      const { getByTestId } = render(<NBSkeleton testID="skeleton" />);
      const skeleton = getByTestId('skeleton');
      expect(skeleton.props.accessibilityLabel).toBe('Memuat konten');
    });
  });

  describe('complete examples', () => {
    it('renders text loading placeholders', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="text" count={3} testID="text-skeleton" />,
      );
      expect(getByTestId('text-skeleton-0')).toBeTruthy();
      expect(getByTestId('text-skeleton-1')).toBeTruthy();
      expect(getByTestId('text-skeleton-2')).toBeTruthy();
    });

    it('renders card loading placeholder', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="card" height={200} testID="card-skeleton" />,
      );
      expect(getByTestId('card-skeleton')).toBeTruthy();
    });

    it('renders list loading placeholders', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="list" count={5} testID="list-skeleton" />,
      );
      expect(getByTestId('list-skeleton-0')).toBeTruthy();
      expect(getByTestId('list-skeleton-4')).toBeTruthy();
    });

    it('renders custom sized button skeleton', () => {
      const { getByTestId } = render(
        <NBSkeleton
          variant="button"
          width={120}
          height={40}
          testID="button-skeleton"
        />,
      );
      expect(getByTestId('button-skeleton')).toBeTruthy();
    });

    it('renders multiple avatar skeletons', () => {
      const { getByTestId } = render(
        <NBSkeleton variant="avatar" count={4} testID="avatar-skeleton" />,
      );
      expect(getByTestId('avatar-skeleton-0')).toBeTruthy();
      expect(getByTestId('avatar-skeleton-1')).toBeTruthy();
      expect(getByTestId('avatar-skeleton-2')).toBeTruthy();
      expect(getByTestId('avatar-skeleton-3')).toBeTruthy();
    });
  });
});
