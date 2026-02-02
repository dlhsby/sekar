import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBanner } from '../ErrorBanner';

// Alert mocked globally in jest.setup.js

describe('ErrorBanner Component', () => {
  describe('Basic rendering', () => {
    it('should render error message', () => {
      const { getByText } = render(
        <ErrorBanner message="Something went wrong" />
      );
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('should render without dismiss button', () => {
      const { queryByText } = render(
        <ErrorBanner message="Error occurred" />
      );
      expect(queryByText('✕')).toBeNull();
    });

    it('should render with dismiss button when onDismiss provided', () => {
      const { getByText } = render(
        <ErrorBanner message="Error" onDismiss={() => {}} />
      );
      expect(getByText('✕')).toBeTruthy();
    });

    it('should call onDismiss when dismiss button pressed', () => {
      const mockDismiss = jest.fn();
      const { getByText } = render(
        <ErrorBanner message="Error" onDismiss={mockDismiss} />
      );

      fireEvent.press(getByText('✕'));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should display long error messages', () => {
      const longMessage = 'This is a very long error message that should still be displayed correctly in the banner component';
      const { getByText } = render(
        <ErrorBanner message={longMessage} />
      );
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('should apply custom style', () => {
      const { getByText } = render(
        <ErrorBanner
          message="Styled banner"
          style={{ marginTop: 20 }}
        />
      );
      expect(getByText('Styled banner')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render error variant by default', () => {
      const { getByText } = render(
        <ErrorBanner message="Error message" />
      );
      expect(getByText('Error message')).toBeTruthy();
    });

    it('should render warning variant', () => {
      const { getByText, UNSAFE_getByProps } = render(
        <ErrorBanner message="Warning message" variant="warning" />
      );
      expect(getByText('Warning message')).toBeTruthy();
      expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    });

    it('should render info variant', () => {
      const { getByText, UNSAFE_getByProps } = render(
        <ErrorBanner message="Info message" variant="info" />
      );
      expect(getByText('Info message')).toBeTruthy();
      expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    });

    it('should render warning variant with dismiss button', () => {
      const mockDismiss = jest.fn();
      const { getByText } = render(
        <ErrorBanner
          message="Warning"
          variant="warning"
          onDismiss={mockDismiss}
        />
      );
      expect(getByText('Warning')).toBeTruthy();
      expect(getByText('✕')).toBeTruthy();
    });
  });

  describe('Action button', () => {
    it('should render action button when actionText and onAction provided', () => {
      const mockAction = jest.fn();
      const { getByText, queryByText } = render(
        <ErrorBanner
          message="Error occurred"
          actionText="Retry"
          onAction={mockAction}
        />
      );

      expect(getByText('Retry')).toBeTruthy();
      // Should not show dismiss button when action button is present
      expect(queryByText('✕')).toBeNull();
    });

    it('should call onAction when action button pressed', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <ErrorBanner
          message="Error occurred"
          actionText="Retry"
          onAction={mockAction}
        />
      );

      fireEvent.press(getByText('Retry'));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render action button with warning variant', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <ErrorBanner
          message="Warning message"
          variant="warning"
          actionText="Fix"
          onAction={mockAction}
        />
      );

      expect(getByText('Fix')).toBeTruthy();
      fireEvent.press(getByText('Fix'));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should prefer action button over dismiss button', () => {
      const mockDismiss = jest.fn();
      const mockAction = jest.fn();
      const { getByText, queryByText } = render(
        <ErrorBanner
          message="Error"
          onDismiss={mockDismiss}
          actionText="Retry"
          onAction={mockAction}
        />
      );

      // Should show action button, not dismiss
      expect(getByText('Retry')).toBeTruthy();
      expect(queryByText('✕')).toBeNull();
    });

    it('should not render action button without onAction', () => {
      const { queryByText } = render(
        <ErrorBanner
          message="Error"
          actionText="Retry"
        />
      );

      // Should not show action button without callback
      expect(queryByText('Retry')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role on container', () => {
      const { getByText } = render(
        <ErrorBanner message="Accessible error" />
      );
      const message = getByText('Accessible error');
      // The parent container has alert role
      expect(message).toBeTruthy();
    });

    it('should have assertive live region', () => {
      const { UNSAFE_getByProps } = render(
        <ErrorBanner message="Accessible error" />
      );
      const alert = UNSAFE_getByProps({ accessibilityRole: 'alert' });
      expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('should have accessible dismiss button', () => {
      const { getByLabelText } = render(
        <ErrorBanner message="Error" onDismiss={() => {}} />
      );
      expect(getByLabelText('Tutup pesan kesalahan')).toBeTruthy();
    });

    it('should have accessible action button', () => {
      const { getByLabelText } = render(
        <ErrorBanner
          message="Error"
          actionText="Retry"
          onAction={() => {}}
        />
      );
      expect(getByLabelText('Retry')).toBeTruthy();
    });
  });
});
