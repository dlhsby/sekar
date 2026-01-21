import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner Component', () => {
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
});
