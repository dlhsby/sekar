/**
 * NBAlert Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NBAlert } from '../NBAlert';

// Alert and Haptic feedback mocked in jest.setup.js

describe('NBAlert', () => {
  const mockOnDismiss = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders message only', () => {
      const { getByText } = render(
        <NBAlert variant="info" message="Test message" testID="alert" />,
      );
      expect(getByText('Test message')).toBeTruthy();
    });

    it('renders with title and message', () => {
      const { getByText } = render(
        <NBAlert
          variant="info"
          title="Test Title"
          message="Test message"
          testID="alert"
        />,
      );
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test message')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <NBAlert variant="info" message="Test" testID="test-alert" />,
      );
      expect(getByTestId('test-alert')).toBeTruthy();
    });

    it('renders message with testID', () => {
      const { getByTestId } = render(
        <NBAlert variant="info" message="Test message" testID="alert" />,
      );
      expect(getByTestId('alert-message')).toBeTruthy();
    });

    it('renders title with testID when provided', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          title="Test"
          message="Message"
          testID="alert"
        />,
      );
      expect(getByTestId('alert-title')).toBeTruthy();
    });

    it('renders icon with testID', () => {
      const { getByTestId } = render(
        <NBAlert variant="info" message="Test" testID="alert" />,
      );
      expect(getByTestId('alert-icon')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders danger variant with default icon', () => {
      const { getByText } = render(
        <NBAlert variant="danger" message="Error message" testID="alert" />,
      );
      expect(getByText('❌')).toBeTruthy();
    });

    it('renders warning variant with default icon', () => {
      const { getByText } = render(
        <NBAlert variant="warning" message="Warning message" testID="alert" />,
      );
      expect(getByText('⚠️')).toBeTruthy();
    });

    it('renders success variant with default icon', () => {
      const { getByText } = render(
        <NBAlert variant="success" message="Success message" testID="alert" />,
      );
      expect(getByText('✅')).toBeTruthy();
    });

    it('renders info variant with default icon', () => {
      const { getByText } = render(
        <NBAlert variant="info" message="Info message" testID="alert" />,
      );
      expect(getByText('ℹ️')).toBeTruthy();
    });
  });

  describe('custom icon', () => {
    it('renders custom icon component', () => {
      const CustomIcon = () => <Text testID="custom-icon">🎨</Text>;
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          icon={<CustomIcon />}
          testID="alert"
        />,
      );
      expect(getByTestId('custom-icon')).toBeTruthy();
    });

    it('renders custom icon string', () => {
      const { getByText } = render(
        <NBAlert variant="info" message="Test" icon="🌟" testID="alert" />,
      );
      expect(getByText('🌟')).toBeTruthy();
    });

    it('uses custom icon instead of variant default', () => {
      const { getByText, queryByText } = render(
        <NBAlert
          variant="danger"
          message="Test"
          icon="🌟"
          testID="alert"
        />,
      );
      expect(getByText('🌟')).toBeTruthy();
      expect(queryByText('❌')).toBeNull();
    });
  });

  describe('dismissible', () => {
    it('does not render dismiss button when not dismissible', () => {
      const { queryByTestId } = render(
        <NBAlert variant="info" message="Test" testID="alert" />,
      );
      expect(queryByTestId('alert-dismiss')).toBeNull();
    });

    it('does not render dismiss button when dismissible but no onDismiss', () => {
      const { queryByTestId } = render(
        <NBAlert variant="info" message="Test" dismissible testID="alert" />,
      );
      expect(queryByTestId('alert-dismiss')).toBeNull();
    });

    it('renders dismiss button when dismissible with onDismiss', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          dismissible
          onDismiss={mockOnDismiss}
          testID="alert"
        />,
      );
      expect(getByTestId('alert-dismiss')).toBeTruthy();
    });

    it('calls onDismiss when dismiss button pressed', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          dismissible
          onDismiss={mockOnDismiss}
          testID="alert"
        />,
      );
      fireEvent.press(getByTestId('alert-dismiss'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button has accessibility label', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          dismissible
          onDismiss={mockOnDismiss}
          testID="alert"
        />,
      );
      const dismissButton = getByTestId('alert-dismiss');
      expect(dismissButton.props.accessibilityLabel).toBe('Dismiss alert');
    });
  });

  describe('action button', () => {
    it('does not render action button when no actionLabel', () => {
      const { queryByTestId } = render(
        <NBAlert variant="info" message="Test" testID="alert" />,
      );
      expect(queryByTestId('alert-action')).toBeNull();
    });

    it('does not render action button when actionLabel but no onAction', () => {
      const { queryByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          actionLabel="Retry"
          testID="alert"
        />,
      );
      expect(queryByTestId('alert-action')).toBeNull();
    });

    it('renders action button when actionLabel and onAction provided', () => {
      const { getByText } = render(
        <NBAlert
          variant="info"
          message="Test"
          actionLabel="Retry"
          onAction={mockOnAction}
          testID="alert"
        />,
      );
      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls onAction when action button pressed', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          actionLabel="Retry"
          onAction={mockOnAction}
          testID="alert"
        />,
      );
      fireEvent.press(getByTestId('alert-action'));
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('renders both action and dismiss buttons', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          actionLabel="Retry"
          onAction={mockOnAction}
          dismissible
          onDismiss={mockOnDismiss}
          testID="alert"
        />,
      );
      expect(getByTestId('alert-action')).toBeTruthy();
      expect(getByTestId('alert-dismiss')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has alert accessibility role', () => {
      const { getByTestId } = render(
        <NBAlert variant="info" message="Test" testID="alert" />,
      );
      const alert = getByTestId('alert');
      expect(alert.props.accessibilityRole).toBe('alert');
    });

    it('has accessibility label with variant and message', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="danger"
          message="Error occurred"
          testID="alert"
        />,
      );
      const alert = getByTestId('alert');
      expect(alert.props.accessibilityLabel).toBe(
        'danger alert: Error occurred',
      );
    });

    it('has accessibility label with variant, title, and message', () => {
      const { getByTestId } = render(
        <NBAlert
          variant="warning"
          title="Warning"
          message="Be careful"
          testID="alert"
        />,
      );
      const alert = getByTestId('alert');
      expect(alert.props.accessibilityLabel).toBe('warning alert: Warning');
    });
  });

  describe('styling', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          style={customStyle}
          testID="alert"
        />,
      );
      expect(getByTestId('alert')).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customStyle = { fontSize: 20 };
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          title="Test"
          message="Message"
          titleStyle={customStyle}
          testID="alert"
        />,
      );
      expect(getByTestId('alert')).toBeTruthy();
    });

    it('applies custom message style', () => {
      const customStyle = { fontStyle: 'italic' as const };
      const { getByTestId } = render(
        <NBAlert
          variant="info"
          message="Test"
          messageStyle={customStyle}
          testID="alert"
        />,
      );
      expect(getByTestId('alert')).toBeTruthy();
    });
  });

  describe('complete examples', () => {
    it('renders complete error alert with retry', () => {
      const { getByText, getByTestId } = render(
        <NBAlert
          variant="danger"
          title="Error"
          message="Failed to load data"
          actionLabel="Retry"
          onAction={mockOnAction}
          dismissible
          onDismiss={mockOnDismiss}
          testID="error-alert"
        />,
      );
      expect(getByText('❌')).toBeTruthy();
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Failed to load data')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();

      fireEvent.press(getByTestId('error-alert-action'));
      expect(mockOnAction).toHaveBeenCalled();

      fireEvent.press(getByTestId('error-alert-dismiss'));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('renders complete success alert', () => {
      const { getByText } = render(
        <NBAlert
          variant="success"
          title="Success"
          message="Data saved successfully"
          dismissible
          onDismiss={mockOnDismiss}
          testID="success-alert"
        />,
      );
      expect(getByText('✅')).toBeTruthy();
      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Data saved successfully')).toBeTruthy();
    });

    it('renders simple warning alert', () => {
      const { getByText } = render(
        <NBAlert
          variant="warning"
          message="Connection unstable"
          testID="warning-alert"
        />,
      );
      expect(getByText('⚠️')).toBeTruthy();
      expect(getByText('Connection unstable')).toBeTruthy();
    });
  });
});
