import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendanceTypeSheet } from '../AttendanceTypeSheet';

describe('AttendanceTypeSheet', () => {
  it('renders both labels and the picker title', () => {
    const { getByText, getByTestId } = render(
      <AttendanceTypeSheet visible value="clock_out" onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(getByText('Pilih Label Waktu')).toBeTruthy();
    expect(getByTestId('attendance-type-option-clock_in')).toBeTruthy();
    expect(getByTestId('attendance-type-option-clock_out')).toBeTruthy();
  });

  it('commits the newly picked label only on confirm (Pilih)', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <AttendanceTypeSheet value="clock_out" visible onSelect={onSelect} onClose={onClose} />,
    );

    // Switch the pending selection to Clock In, then confirm.
    fireEvent.press(getByTestId('attendance-type-option-clock_in'));
    fireEvent.press(getByText('Pilih'));

    expect(onSelect).toHaveBeenCalledWith('clock_in');
    expect(onClose).toHaveBeenCalled();
  });

  it('cancelling does not commit a selection', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <AttendanceTypeSheet value="clock_out" visible onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('attendance-type-option-clock_in'));
    fireEvent.press(getByText('Batal'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the disabled hint next to the invalid action', () => {
    const { getByText } = render(
      <AttendanceTypeSheet
        value="clock_out"
        visible
        onSelect={jest.fn()}
        onClose={jest.fn()}
        disabledAction="clock_in"
        disabledHint="Anda masih memiliki shift aktif."
      />,
    );

    expect(getByText('Anda masih memiliki shift aktif.')).toBeTruthy();
  });
});
