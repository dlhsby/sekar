import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
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
});
