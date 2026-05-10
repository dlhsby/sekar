/**
 * NBButton Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBButton } from '../NBButton';

// Haptic feedback mocked in jest.setup.js

describe('NBButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(
        <NBButton title="Submit" onPress={mockOnPress} />,
      );
      expect(getByText('Submit')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} testID="submit-btn" />,
      );
      expect(getByTestId('submit-btn')).toBeTruthy();
    });

    it('renders loading spinner when loading', () => {
      const { getByTestId, queryByText } = render(
        <NBButton
          title="Submit"
          onPress={mockOnPress}
          loading
          testID="submit-btn"
        />,
      );
      expect(getByTestId('submit-btn-spinner')).toBeTruthy();
      expect(queryByText('Submit')).toBeNull();
    });
  });

  describe('variants', () => {
    it('renders primary variant by default', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} testID="btn" />,
      );
      const button = getByTestId('btn');
      expect(button.props.style).toBeDefined();
    });

    it('renders secondary variant', () => {
      const { getByTestId } = render(
        <NBButton
          title="Cancel"
          onPress={mockOnPress}
          variant="secondary"
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByTestId } = render(
        <NBButton
          title="Done"
          onPress={mockOnPress}
          variant="success"
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders danger variant', () => {
      const { getByTestId } = render(
        <NBButton
          title="Delete"
          onPress={mockOnPress}
          variant="danger"
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      const { getByTestId } = render(
        <NBButton
          title="Skip"
          onPress={mockOnPress}
          variant="ghost"
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders sm size', () => {
      const { getByTestId } = render(
        <NBButton title="Small" onPress={mockOnPress} size="sm" testID="btn" />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders md size by default', () => {
      const { getByTestId } = render(
        <NBButton title="Medium" onPress={mockOnPress} testID="btn" />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('renders lg size', () => {
      const { getByTestId } = render(
        <NBButton title="Large" onPress={mockOnPress} size="lg" testID="btn" />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress when pressed', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} disabled testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} loading testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has button accessibility role', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} testID="btn" />,
      );
      const button = getByTestId('btn');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} testID="btn" />,
      );
      const button = getByTestId('btn');
      expect(button.props.accessibilityLabel).toBe('Submit');
    });

    it('indicates disabled state', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} disabled testID="btn" />,
      );
      const button = getByTestId('btn');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('indicates busy state when loading', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} loading testID="btn" />,
      );
      const button = getByTestId('btn');
      expect(button.props.accessibilityState.busy).toBe(true);
    });
  });

  describe('styling', () => {
    it('applies fullWidth style', () => {
      const { getByTestId } = render(
        <NBButton title="Submit" onPress={mockOnPress} fullWidth testID="btn" />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBButton
          title="Submit"
          onPress={mockOnPress}
          style={customStyle}
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });

    it('applies custom text style', () => {
      const customTextStyle = { fontWeight: 'bold' as const };
      const { getByTestId } = render(
        <NBButton
          title="Submit"
          onPress={mockOnPress}
          textStyle={customTextStyle}
          testID="btn"
        />,
      );
      expect(getByTestId('btn')).toBeTruthy();
    });
  });

  describe('Phase 3 prop compat (Apr 27)', () => {
    // Regression: SubmitScreen + ReviewQueueScreen + AssignToTaskSheet were
    // crashing on render because they used `label`, `leftIcon`, `outline` variant,
    // and string children — none of which the original API supported.
    it('accepts `label` as alias for `title`', () => {
      const { getByText } = render(
        <NBButton label="Konversi" onPress={mockOnPress} />,
      );
      expect(getByText('Konversi')).toBeTruthy();
    });

    it('renders string children when no title/label given', () => {
      const { getByText } = render(
        <NBButton onPress={mockOnPress}>Kembali</NBButton>,
      );
      expect(getByText('Kembali')).toBeTruthy();
    });

    it('renders `outline` variant without crashing', () => {
      const { getByTestId } = render(
        <NBButton
          title="Batal"
          onPress={mockOnPress}
          variant="outline"
          testID="btn-outline"
        />,
      );
      expect(getByTestId('btn-outline')).toBeTruthy();
    });

    it('falls back to primary on unknown variant (does not crash)', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { getByTestId } = render(
        <NBButton
          title="Bug"
          onPress={mockOnPress}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          variant={'nonexistent' as any}
          testID="btn-bug"
        />,
      );
      expect(getByTestId('btn-bug')).toBeTruthy();
      warn.mockRestore();
    });

    it('renders leftIcon alongside the label', () => {
      const { getByText } = render(
        <NBButton
          label="Setujui"
          leftIcon="check"
          onPress={mockOnPress}
        />,
      );
      expect(getByText('Setujui')).toBeTruthy();
    });
  });
});
