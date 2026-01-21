import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    const { getByTestId } = render(<LoadingSpinner />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should render with custom size', () => {
    const { getByTestId } = render(<LoadingSpinner size="small" />);
    const spinner = getByTestId('loading-spinner');
    expect(spinner.props.size).toBe('small');
  });

  it('should render with custom color', () => {
    const { getByTestId } = render(<LoadingSpinner color="#FF0000" />);
    const spinner = getByTestId('loading-spinner');
    expect(spinner.props.color).toBe('#FF0000');
  });

  it('should render full screen loading', () => {
    const { getByTestId } = render(<LoadingSpinner fullScreen />);
    expect(getByTestId('loading-container')).toBeTruthy();
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should render with message', () => {
    const { getByText } = render(<LoadingSpinner message="Loading data..." />);
    expect(getByText('Loading data...')).toBeTruthy();
  });
});
