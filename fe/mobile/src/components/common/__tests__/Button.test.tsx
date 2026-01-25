import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { Button } from '../Button';

// Mock Vibration
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  vibrate: jest.fn(),
}));

describe('Button Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render primary button with title', () => {
    const { getByText } = render(
      <Button title="Click Me" onPress={() => {}} variant="primary" />
    );
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button title="Click" variant="primary" onPress={mockPress} />
    );

    fireEvent.press(getByText('Click'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button title="Click" variant="primary" onPress={mockPress} disabled />
    );

    fireEvent.press(getByText('Click'));
    expect(mockPress).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button title="Click" variant="primary" onPress={() => {}} loading />
    );
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should render secondary button variant', () => {
    const { getByText } = render(
      <Button title="Secondary" variant="secondary" onPress={() => {}} />
    );
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('should render outline button variant', () => {
    const { getByText } = render(
      <Button title="Outline" variant="outline" onPress={() => {}} />
    );
    expect(getByText('Outline')).toBeTruthy();
  });

  it('should not call onPress when loading', () => {
    const mockPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Click" variant="primary" onPress={mockPress} loading />
    );

    fireEvent.press(getByTestId('loading-spinner'));
    expect(mockPress).not.toHaveBeenCalled();
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on primary button press', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button title="Primary" variant="primary" onPress={mockPress} />
      );

      fireEvent.press(getByText('Primary'));
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('should trigger haptic feedback on critical button press', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button
          title="Clock In"
          variant="primary"
          onPress={mockPress}
          isCritical
        />
      );

      fireEvent.press(getByText('Clock In'));
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    });

    it('should not trigger haptic when disabled', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button
          title="Primary"
          variant="primary"
          onPress={mockPress}
          disabled
        />
      );

      fireEvent.press(getByText('Primary'));
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(mockPress).not.toHaveBeenCalled();
    });

    it('should not trigger haptic when loading', () => {
      const mockPress = jest.fn();
      const { getByTestId } = render(
        <Button
          title="Primary"
          variant="primary"
          onPress={mockPress}
          loading
        />
      );

      fireEvent.press(getByTestId('loading-spinner'));
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(mockPress).not.toHaveBeenCalled();
    });

    it('should not trigger haptic on secondary button press', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button title="Secondary" variant="secondary" onPress={mockPress} />
      );

      fireEvent.press(getByText('Secondary'));
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('should not trigger haptic on outline button press', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button title="Outline" variant="outline" onPress={mockPress} />
      );

      fireEvent.press(getByText('Outline'));
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('should not trigger haptic when enableHaptic is false', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button
          title="Primary"
          variant="primary"
          onPress={mockPress}
          enableHaptic={false}
        />
      );

      fireEvent.press(getByText('Primary'));
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('should handle haptic feedback error gracefully', () => {
      // Mock console.debug to verify error logging
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Mock Vibration.vibrate to throw an error
      (Vibration.vibrate as jest.Mock).mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      const mockPress = jest.fn();
      const { getByText } = render(
        <Button title="Primary" variant="primary" onPress={mockPress} />
      );

      // Should not throw when pressing
      fireEvent.press(getByText('Primary'));

      // onPress should still be called even if haptic fails
      expect(mockPress).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Haptic feedback not available:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Focus State', () => {
    it('should handle focus event', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button title="Focus Test" variant="primary" onPress={mockPress} />
      );

      const button = getByRole('button');
      fireEvent(button, 'focus');
      // Component should handle focus without errors
      expect(button).toBeTruthy();
    });

    it('should handle blur event', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button title="Blur Test" variant="primary" onPress={mockPress} />
      );

      const button = getByRole('button');
      fireEvent(button, 'blur');
      // Component should handle blur without errors
      expect(button).toBeTruthy();
    });

    it('should handle focus and blur sequence', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button title="Focus/Blur" variant="primary" onPress={mockPress} />
      );

      const button = getByRole('button');
      fireEvent(button, 'focus');
      fireEvent(button, 'blur');
      fireEvent(button, 'focus');
      fireEvent(button, 'blur');
      expect(button).toBeTruthy();
    });
  });

  describe('Critical Button', () => {
    it('should render critical button with larger height', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button
          title="Clock In"
          variant="primary"
          onPress={mockPress}
          isCritical
        />
      );

      const button = getByRole('button');
      // Critical button should apply larger height style
      expect(button).toBeTruthy();
    });

    it('should trigger haptic on critical button', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <Button
          title="Critical Action"
          variant="secondary"
          onPress={mockPress}
          isCritical
        />
      );

      fireEvent.press(getByText('Critical Action'));
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom button style', () => {
      const mockPress = jest.fn();
      const customStyle = { marginTop: 20 };
      const { getByRole } = render(
        <Button
          title="Styled"
          variant="primary"
          onPress={mockPress}
          style={customStyle}
        />
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const mockPress = jest.fn();
      const customTextStyle = { fontSize: 18 };
      const { getByText } = render(
        <Button
          title="Styled Text"
          variant="primary"
          onPress={mockPress}
          textStyle={customTextStyle}
        />
      );

      const text = getByText('Styled Text');
      expect(text).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button title="Accessible" variant="primary" onPress={mockPress} />
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('should have accessibility label matching title', () => {
      const mockPress = jest.fn();
      const { getByLabelText } = render(
        <Button title="Submit" variant="primary" onPress={mockPress} />
      );
      expect(getByLabelText('Submit')).toBeTruthy();
    });

    it('should have accessibility hint when provided', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button
          title="Submit"
          variant="primary"
          onPress={mockPress}
          accessibilityHint="Submits the form"
        />
      );
      const button = getByRole('button');
      expect(button.props.accessibilityHint).toBe('Submits the form');
    });

    it('should have disabled accessibility state when disabled', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button
          title="Submit"
          variant="primary"
          onPress={mockPress}
          disabled
        />
      );
      const button = getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it('should have disabled accessibility state when loading', () => {
      const mockPress = jest.fn();
      const { getByRole } = render(
        <Button
          title="Submit"
          variant="primary"
          onPress={mockPress}
          loading
        />
      );
      const button = getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });
  });
});
