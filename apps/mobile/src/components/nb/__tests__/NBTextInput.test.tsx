/**
 * NBTextInput Component Tests
 */

import React, { createRef } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { NBTextInput } from '../NBTextInput';

describe('NBTextInput', () => {
  describe('rendering', () => {
    it('renders without label', () => {
      const { getByTestId } = render(
        <NBTextInput placeholder="Enter text" testID="input" />,
      );
      expect(getByTestId('input-input')).toBeTruthy();
    });

    it('renders with label', () => {
      const { getByText, getByTestId } = render(
        <NBTextInput label="Email" placeholder="Enter email" testID="input" />,
      );
      expect(getByText('Email')).toBeTruthy();
      expect(getByTestId('input-label')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBTextInput placeholder="Enter text" testID="email-input" />,
      );
      expect(getByTestId('email-input')).toBeTruthy();
    });

    it('renders placeholder', () => {
      const { getByTestId } = render(
        <NBTextInput placeholder="Type here..." testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.placeholder).toBe('Type here...');
    });
  });

  describe('value handling', () => {
    it('displays value', () => {
      const { getByTestId } = render(
        <NBTextInput value="test@example.com" testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.value).toBe('test@example.com');
    });

    it('calls onChangeText when text changes', () => {
      const handleChange = jest.fn();
      const { getByTestId } = render(
        <NBTextInput onChangeText={handleChange} testID="input" />,
      );
      fireEvent.changeText(getByTestId('input-input'), 'new value');
      expect(handleChange).toHaveBeenCalledWith('new value');
    });
  });

  describe('error state', () => {
    it('renders error message', () => {
      const { getByText, getByTestId } = render(
        <NBTextInput error="This field is required" testID="input" />,
      );
      expect(getByText('This field is required')).toBeTruthy();
      expect(getByTestId('input-error')).toBeTruthy();
    });

    it('does not render helper text when error is present', () => {
      const { queryByText, getByText } = render(
        <NBTextInput
          error="Invalid email"
          helperText="Enter your email address"
          testID="input"
        />,
      );
      expect(getByText('Invalid email')).toBeTruthy();
      expect(queryByText('Enter your email address')).toBeNull();
    });
  });

  describe('helper text', () => {
    it('renders helper text', () => {
      const { getByText, getByTestId } = render(
        <NBTextInput
          helperText="We'll never share your email"
          testID="input"
        />,
      );
      expect(getByText("We'll never share your email")).toBeTruthy();
      expect(getByTestId('input-helper')).toBeTruthy();
    });
  });

  describe('success state', () => {
    it('renders with success state', () => {
      const { getByTestId } = render(
        <NBTextInput success testID="input" />,
      );
      expect(getByTestId('input')).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('renders disabled state', () => {
      const { getByTestId } = render(
        <NBTextInput editable={false} testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('focus handling', () => {
    it('calls onFocus when focused', () => {
      const handleFocus = jest.fn();
      const { getByTestId } = render(
        <NBTextInput onFocus={handleFocus} testID="input" />,
      );
      fireEvent(getByTestId('input-input'), 'focus');
      expect(handleFocus).toHaveBeenCalled();
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = jest.fn();
      const { getByTestId } = render(
        <NBTextInput onBlur={handleBlur} testID="input" />,
      );
      fireEvent(getByTestId('input-input'), 'blur');
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to TextInput', () => {
      const ref = createRef<TextInput>();
      render(<NBTextInput ref={ref} testID="input" />);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies custom container style', () => {
      const customStyle = { marginBottom: 20 };
      const { getByTestId } = render(
        <NBTextInput containerStyle={customStyle} testID="input" />,
      );
      expect(getByTestId('input')).toBeTruthy();
    });

    it('applies custom input style', () => {
      const customStyle = { paddingHorizontal: 20 };
      const { getByTestId } = render(
        <NBTextInput inputStyle={customStyle} testID="input" />,
      );
      expect(getByTestId('input')).toBeTruthy();
    });

    it('applies custom label style', () => {
      const customStyle = { fontSize: 18 };
      const { getByTestId } = render(
        <NBTextInput label="Name" labelStyle={customStyle} testID="input" />,
      );
      expect(getByTestId('input')).toBeTruthy();
    });
  });

  describe('TextInput props', () => {
    it('passes through keyboardType', () => {
      const { getByTestId } = render(
        <NBTextInput keyboardType="email-address" testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('passes through secureTextEntry', () => {
      const { getByTestId } = render(
        <NBTextInput secureTextEntry testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('passes through autoCapitalize', () => {
      const { getByTestId } = render(
        <NBTextInput autoCapitalize="none" testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('passes through maxLength', () => {
      const { getByTestId } = render(
        <NBTextInput maxLength={50} testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.maxLength).toBe(50);
    });

    it('passes through multiline', () => {
      const { getByTestId } = render(
        <NBTextInput multiline numberOfLines={4} testID="input" />,
      );
      const input = getByTestId('input-input');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(4);
    });
  });
});
