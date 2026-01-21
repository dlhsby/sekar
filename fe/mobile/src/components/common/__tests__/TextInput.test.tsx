import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from '../TextInput';

describe('TextInput Component', () => {
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

  it('should display error message', () => {
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

  it('should show controlled value', () => {
    const { getByDisplayValue } = render(
      <TextInput value="Initial Value" onChangeText={() => {}} />
    );
    expect(getByDisplayValue('Initial Value')).toBeTruthy();
  });

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
});
