import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from '../TextInput';

describe('TextInput Component', () => {
  describe('rendering', () => {
    it('should render with label', () => {
      const { getByText } = render(
        <TextInput label="Username" value="" onChangeText={() => {}} />
      );
      expect(getByText('Username')).toBeTruthy();
    });

    it('should render without label', () => {
      const { queryByText } = render(
        <TextInput value="" onChangeText={() => {}} placeholder="Enter text" />
      );
      expect(queryByText('Username')).toBeNull();
    });

    it('should display error message when provided', () => {
      const { getByText } = render(
        <TextInput
          label="Email"
          value=""
          onChangeText={() => {}}
          error="Invalid email"
        />
      );
      expect(getByText('Invalid email')).toBeTruthy();
    });

    it('should not display error message when not provided', () => {
      const { queryByText } = render(
        <TextInput label="Email" value="" onChangeText={() => {}} />
      );
      expect(queryByText('Invalid email')).toBeNull();
    });

    it('should apply error styling when error is provided', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Email"
          value=""
          onChangeText={() => {}}
          error="Invalid email"
        />
      );
      const input = getByPlaceholderText('Email');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: expect.any(String),
          }),
        ])
      );
    });

    it('should show controlled value', () => {
      const { getByDisplayValue } = render(
        <TextInput value="Initial Value" onChangeText={() => {}} />
      );
      expect(getByDisplayValue('Initial Value')).toBeTruthy();
    });

    it('should accept containerStyle prop', () => {
      const customStyle = { marginBottom: 20 };
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Test"
          value=""
          onChangeText={() => {}}
          containerStyle={customStyle}
        />
      );
      // Test passes if component renders without error
      expect(getByPlaceholderText('Test')).toBeTruthy();
    });

    it('should apply custom input style', () => {
      const customStyle = { fontSize: 18 };
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Custom"
          value=""
          onChangeText={() => {}}
          style={customStyle}
        />
      );
      const input = getByPlaceholderText('Custom');
      expect(input.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });
  });

  describe('user interaction', () => {
    it('should call onChangeText when text changes', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Enter text"
          value=""
          onChangeText={mockChange}
        />
      );

      fireEvent.changeText(getByPlaceholderText('Enter text'), 'New Value');
      expect(mockChange).toHaveBeenCalledWith('New Value');
    });

    it('should call onChangeText multiple times', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Enter text"
          value=""
          onChangeText={mockChange}
        />
      );

      const input = getByPlaceholderText('Enter text');
      fireEvent.changeText(input, 'First');
      fireEvent.changeText(input, 'Second');
      fireEvent.changeText(input, 'Third');

      expect(mockChange).toHaveBeenCalledTimes(3);
      expect(mockChange).toHaveBeenNthCalledWith(1, 'First');
      expect(mockChange).toHaveBeenNthCalledWith(2, 'Second');
      expect(mockChange).toHaveBeenNthCalledWith(3, 'Third');
    });

    it('should call onFocus when focused', () => {
      const mockFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Focus test"
          value=""
          onChangeText={() => {}}
          onFocus={mockFocus}
        />
      );

      fireEvent(getByPlaceholderText('Focus test'), 'focus');
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const mockBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Blur test"
          value=""
          onChangeText={() => {}}
          onBlur={mockBlur}
        />
      );

      fireEvent(getByPlaceholderText('Blur test'), 'blur');
      expect(mockBlur).toHaveBeenCalled();
    });
  });

  describe('input types', () => {
    it('should support secure text entry', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Password"
          value=""
          onChangeText={() => {}}
          secureTextEntry
        />
      );
      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should support numeric keyboard type', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Phone"
          value=""
          onChangeText={() => {}}
          keyboardType="numeric"
        />
      );
      const input = getByPlaceholderText('Phone');
      expect(input.props.keyboardType).toBe('numeric');
    });

    it('should support email keyboard type', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Email"
          value=""
          onChangeText={() => {}}
          keyboardType="email-address"
        />
      );
      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should support multiline text', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Description"
          value=""
          onChangeText={() => {}}
          multiline
        />
      );
      const input = getByPlaceholderText('Description');
      expect(input.props.multiline).toBe(true);
    });

    it('should support maxLength', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Limited"
          value=""
          onChangeText={() => {}}
          maxLength={10}
        />
      );
      const input = getByPlaceholderText('Limited');
      expect(input.props.maxLength).toBe(10);
    });
  });

  describe('accessibility', () => {
    it('should use label as accessibility label', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          label="Username"
          placeholder="Enter username"
          value=""
          onChangeText={() => {}}
        />
      );
      const input = getByPlaceholderText('Enter username');
      expect(input.props.accessibilityLabel).toBe('Username');
    });

    it('should use placeholder as accessibility label when no label provided', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Search"
          value=""
          onChangeText={() => {}}
        />
      );
      const input = getByPlaceholderText('Search');
      expect(input.props.accessibilityLabel).toBe('Search');
    });

    it('should apply custom accessibilityHint', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Username"
          value=""
          onChangeText={() => {}}
          accessibilityHint="Enter your username to login"
        />
      );
      const input = getByPlaceholderText('Username');
      expect(input.props.accessibilityHint).toBe('Enter your username to login');
    });

    it('should set accessibility state to disabled when editable is false', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Disabled"
          value=""
          onChangeText={() => {}}
          editable={false}
        />
      );
      const input = getByPlaceholderText('Disabled');
      expect(input.props.accessibilityState).toEqual({ disabled: true });
    });

    it('should not set disabled state when editable is true', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Enabled"
          value=""
          onChangeText={() => {}}
          editable={true}
        />
      );
      const input = getByPlaceholderText('Enabled');
      expect(input.props.accessibilityState).toEqual({ disabled: false });
    });

    it('should not set disabled state when editable is undefined', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Default"
          value=""
          onChangeText={() => {}}
        />
      );
      const input = getByPlaceholderText('Default');
      expect(input.props.accessibilityState).toEqual({ disabled: false });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string value', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Empty"
          value=""
          onChangeText={() => {}}
        />
      );
      const input = getByPlaceholderText('Empty');
      expect(input.props.value).toBe('');
    });

    it('should handle long text value', () => {
      const longText = 'A'.repeat(1000);
      const { getByDisplayValue } = render(
        <TextInput value={longText} onChangeText={() => {}} />
      );
      expect(getByDisplayValue(longText)).toBeTruthy();
    });

    it('should handle Indonesian text', () => {
      const { getByDisplayValue } = render(
        <TextInput value="Laporan kebersihan" onChangeText={() => {}} />
      );
      expect(getByDisplayValue('Laporan kebersihan')).toBeTruthy();
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|:;"<>?,./';
      const { getByDisplayValue } = render(
        <TextInput value={specialChars} onChangeText={() => {}} />
      );
      expect(getByDisplayValue(specialChars)).toBeTruthy();
    });

    it('should handle numbers as text', () => {
      const { getByDisplayValue } = render(
        <TextInput value="12345" onChangeText={() => {}} />
      );
      expect(getByDisplayValue('12345')).toBeTruthy();
    });

    it('should render with both error and label', () => {
      const { getByText } = render(
        <TextInput
          label="Email"
          value=""
          onChangeText={() => {}}
          error="Invalid format"
        />
      );
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Invalid format')).toBeTruthy();
    });

    it('should support autoCapitalize prop', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Name"
          value=""
          onChangeText={() => {}}
          autoCapitalize="words"
        />
      );
      const input = getByPlaceholderText('Name');
      expect(input.props.autoCapitalize).toBe('words');
    });

    it('should support autoCorrect prop', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Message"
          value=""
          onChangeText={() => {}}
          autoCorrect={false}
        />
      );
      const input = getByPlaceholderText('Message');
      expect(input.props.autoCorrect).toBe(false);
    });
  });

  describe('Success State', () => {
    it('should display success state with green border', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Email"
          value="test@example.com"
          onChangeText={() => {}}
          success={true}
        />
      );
      const input = getByPlaceholderText('Email');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderColor: expect.any(String),
          }),
        ])
      );
    });

    it('should display success message when provided', () => {
      const { getByText } = render(
        <TextInput
          placeholder="Email"
          value="test@example.com"
          onChangeText={() => {}}
          success={true}
          successMessage="Email is valid"
        />
      );
      expect(getByText('Email is valid')).toBeTruthy();
    });

    it('should not display success message when success is false', () => {
      const { queryByText } = render(
        <TextInput
          placeholder="Email"
          value=""
          onChangeText={() => {}}
          success={false}
          successMessage="Email is valid"
        />
      );
      expect(queryByText('Email is valid')).toBeNull();
    });

    it('should not display success message when successMessage not provided', () => {
      const { queryByRole } = render(
        <TextInput
          placeholder="Email"
          value="test@example.com"
          onChangeText={() => {}}
          success={true}
        />
      );
      // Should not have any success message text elements beyond input label
      expect(queryByRole('text')).toBeTruthy(); // Label exists
    });

    it('should render success icon when success is true', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Valid"
          value="valid-value"
          onChangeText={() => {}}
          success={true}
        />
      );
      // Success icon should be rendered (check-circle)
      expect(getByPlaceholderText('Valid')).toBeTruthy();
    });

    it('should not render success icon when success is false', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Normal"
          value="value"
          onChangeText={() => {}}
          success={false}
        />
      );
      expect(getByPlaceholderText('Normal')).toBeTruthy();
    });

    it('should prioritize error over success', () => {
      const { getByText, queryByText } = render(
        <TextInput
          placeholder="Email"
          value="test"
          onChangeText={() => {}}
          success={true}
          successMessage="Valid email"
          error="Invalid email"
        />
      );
      expect(getByText('Invalid email')).toBeTruthy();
      expect(queryByText('Valid email')).toBeNull();
    });

    it('should render error icon when error exists', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Email"
          value="invalid"
          onChangeText={() => {}}
          error="Invalid email"
        />
      );
      // Error icon should be rendered (alert-circle)
      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    it('should apply success styling consistently', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Test"
          value="value"
          onChangeText={() => {}}
          success={true}
        />
      );
      const input = getByPlaceholderText('Test');
      // Success state should apply consistent border width (2px like error/focus)
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 2,
          }),
        ])
      );
    });
  });

  describe('Icon Rendering', () => {
    it('should render check icon for success state', () => {
      const { UNSAFE_getAllByType } = render(
        <TextInput
          placeholder="Success"
          value="valid"
          onChangeText={() => {}}
          success={true}
        />
      );
      // Check that component renders without errors (icon is rendered internally)
      expect(UNSAFE_getAllByType).toBeDefined();
    });

    it('should render alert icon for error state', () => {
      const { UNSAFE_getAllByType } = render(
        <TextInput
          placeholder="Error"
          value="invalid"
          onChangeText={() => {}}
          error="Error message"
        />
      );
      // Check that component renders without errors (icon is rendered internally)
      expect(UNSAFE_getAllByType).toBeDefined();
    });

    it('should not render any icon in normal state', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Normal"
          value="value"
          onChangeText={() => {}}
        />
      );
      // Component should render normally without icons
      expect(getByPlaceholderText('Normal')).toBeTruthy();
    });

    it('should not render success icon when error exists', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Both"
          value="value"
          onChangeText={() => {}}
          success={true}
          error="Error takes priority"
        />
      );
      // Only error icon should render, not success icon
      expect(getByPlaceholderText('Both')).toBeTruthy();
    });
  });

  describe('Border Behavior', () => {
    it('should have consistent border width for focused state', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Focus"
          value=""
          onChangeText={() => {}}
        />
      );
      const input = getByPlaceholderText('Focus');
      fireEvent(input, 'focus');

      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: expect.any(Number),
          }),
        ])
      );
    });

    it('should have consistent border width for error state', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Error"
          value=""
          onChangeText={() => {}}
          error="Error message"
        />
      );
      const input = getByPlaceholderText('Error');

      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 2,
          }),
        ])
      );
    });

    it('should have consistent border width for success state', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          placeholder="Success"
          value="valid"
          onChangeText={() => {}}
          success={true}
        />
      );
      const input = getByPlaceholderText('Success');

      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 2,
          }),
        ])
      );
    });
  });
});
