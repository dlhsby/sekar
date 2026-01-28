/**
 * NBPasswordInput Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBPasswordInput } from '../NBPasswordInput';

describe('NBPasswordInput', () => {
  const mockOnChangeText = jest.fn();
  const mockOnFocus = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with label', () => {
      const { getByText } = render(
        <NBPasswordInput label="Password" testID="password-input" />,
      );
      expect(getByText('Password')).toBeTruthy();
    });

    it('renders with placeholder', () => {
      const { getByPlaceholderText } = render(
        <NBPasswordInput
          placeholder="Enter your password"
          testID="password-input"
        />,
      );
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBPasswordInput testID="password-input" />,
      );
      expect(getByTestId('password-input')).toBeTruthy();
      expect(getByTestId('password-input-input')).toBeTruthy();
      expect(getByTestId('password-input-toggle')).toBeTruthy();
    });

    it('renders helper text when no error', () => {
      const { getByText } = render(
        <NBPasswordInput
          helperText="Must be at least 8 characters"
          testID="password-input"
        />,
      );
      expect(getByText('Must be at least 8 characters')).toBeTruthy();
    });

    it('renders error message', () => {
      const { getByText, getByTestId } = render(
        <NBPasswordInput
          error="Password is required"
          testID="password-input"
        />,
      );
      expect(getByText('Password is required')).toBeTruthy();
      expect(getByTestId('password-input-error')).toBeTruthy();
    });

    it('does not render helper text when error is shown', () => {
      const { queryByText } = render(
        <NBPasswordInput
          error="Password is required"
          helperText="This should not appear"
          testID="password-input"
        />,
      );
      expect(queryByText('This should not appear')).toBeNull();
    });
  });

  describe('password visibility toggle', () => {
    it('starts with password hidden', () => {
      const { getByTestId } = render(
        <NBPasswordInput value="secret123" testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('toggles password visibility when toggle button is pressed', () => {
      const { getByTestId } = render(
        <NBPasswordInput value="secret123" testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      const toggleButton = getByTestId('password-input-toggle');

      // Initially hidden
      expect(input.props.secureTextEntry).toBe(true);

      // Press to show
      fireEvent.press(toggleButton);
      expect(input.props.secureTextEntry).toBe(false);

      // Press to hide again
      fireEvent.press(toggleButton);
      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  describe('text input', () => {
    it('calls onChangeText when text changes', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          onChangeText={mockOnChangeText}
          testID="password-input"
        />,
      );
      const input = getByTestId('password-input-input');
      fireEvent.changeText(input, 'newpassword');
      expect(mockOnChangeText).toHaveBeenCalledWith('newpassword');
    });

    it('displays current value', () => {
      const { getByTestId } = render(
        <NBPasswordInput value="mypassword" testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      expect(input.props.value).toBe('mypassword');
    });
  });

  describe('focus and blur', () => {
    it('calls onFocus when focused', () => {
      const { getByTestId } = render(
        <NBPasswordInput onFocus={mockOnFocus} testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      fireEvent(input, 'focus');
      expect(mockOnFocus).toHaveBeenCalled();
    });

    it('calls onBlur when blurred', () => {
      const { getByTestId } = render(
        <NBPasswordInput onBlur={mockOnBlur} testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      fireEvent(input, 'blur');
      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('disables input when editable is false', () => {
      const { getByTestId } = render(
        <NBPasswordInput editable={false} testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      expect(input.props.editable).toBe(false);
    });

    it('disables toggle button when editable is false', () => {
      const { getByTestId } = render(
        <NBPasswordInput editable={false} testID="password-input" />,
      );
      const toggleButton = getByTestId('password-input-toggle');
      expect(toggleButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label from input label', () => {
      const { getByTestId } = render(
        <NBPasswordInput label="Password" testID="password-input" />,
      );
      const input = getByTestId('password-input-input');
      expect(input.props.accessibilityLabel).toBe('Password');
    });

    it('uses custom accessibilityLabel when provided', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          label="Password"
          accessibilityLabel="Custom label"
          testID="password-input"
        />,
      );
      const input = getByTestId('password-input-input');
      expect(input.props.accessibilityLabel).toBe('Custom label');
    });

    it('toggle button has correct accessibility label', () => {
      const { getByTestId } = render(
        <NBPasswordInput testID="password-input" />,
      );
      const toggleButton = getByTestId('password-input-toggle');
      expect(toggleButton.props.accessibilityLabel).toBe('Tampilkan password');
    });

    it('toggle button accessibility label changes after toggle', () => {
      const { getByTestId } = render(
        <NBPasswordInput testID="password-input" />,
      );
      const toggleButton = getByTestId('password-input-toggle');

      // Press to show
      fireEvent.press(toggleButton);
      expect(toggleButton.props.accessibilityLabel).toBe('Sembunyikan password');

      // Press to hide
      fireEvent.press(toggleButton);
      expect(toggleButton.props.accessibilityLabel).toBe('Tampilkan password');
    });

    it('toggle button has button accessibility role', () => {
      const { getByTestId } = render(
        <NBPasswordInput testID="password-input" />,
      );
      const toggleButton = getByTestId('password-input-toggle');
      expect(toggleButton.props.accessibilityRole).toBe('button');
    });

    it('uses custom show/hide password labels', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          showPasswordLabel="Show password"
          hidePasswordLabel="Hide password"
          testID="password-input"
        />,
      );
      const toggleButton = getByTestId('password-input-toggle');
      expect(toggleButton.props.accessibilityLabel).toBe('Show password');

      fireEvent.press(toggleButton);
      expect(toggleButton.props.accessibilityLabel).toBe('Hide password');
    });
  });

  describe('success state', () => {
    it('applies success styling', () => {
      const { getByTestId } = render(
        <NBPasswordInput success testID="password-input" />,
      );
      // Success state is visual - just ensure it renders without error
      expect(getByTestId('password-input')).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('accepts custom container style', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          containerStyle={{ marginTop: 20 }}
          testID="password-input"
        />,
      );
      expect(getByTestId('password-input')).toBeTruthy();
    });

    it('accepts custom input style', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          inputStyle={{ fontSize: 18 }}
          testID="password-input"
        />,
      );
      expect(getByTestId('password-input-input')).toBeTruthy();
    });

    it('accepts custom label style', () => {
      const { getByTestId } = render(
        <NBPasswordInput
          label="Password"
          labelStyle={{ color: 'blue' }}
          testID="password-input"
        />,
      );
      expect(getByTestId('password-input-label')).toBeTruthy();
    });
  });
});
