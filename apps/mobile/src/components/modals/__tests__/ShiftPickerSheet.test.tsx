import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftPickerSheet } from '../ShiftPickerSheet';
import type { ShiftOption } from '../../../types/api.types';

const options: ShiftOption[] = [
  {
    shift_definition_id: 'sd-3',
    shift_name: 'Shift 3',
    start_time: '21:00:00',
    end_time: '05:00:00',
    crosses_midnight: true,
    service_day: '2026-07-24',
    phase: 'covering',
    minutes_to_start: -30,
    is_default: true,
  },
  {
    shift_definition_id: 'sd-1',
    shift_name: 'Shift 1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    service_day: '2026-07-25',
    phase: 'early',
    minutes_to_start: 30,
    is_default: false,
  },
];

describe('ShiftPickerSheet', () => {
  it('lists the options and confirms the selected shift', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId, getByText } = render(
      <ShiftPickerSheet
        visible
        options={options}
        value={null}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    // Pick the second (non-default) shift, then confirm.
    fireEvent.press(getByTestId('shift-picker-option-sd-1'));
    fireEvent.press(getByText('Pilih'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ shift_definition_id: 'sd-1' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('defaults the selection to the is_default option', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ShiftPickerSheet visible options={options} onSelect={onSelect} onClose={jest.fn()} />,
    );
    // Confirm without changing selection → the default (sd-3) is chosen.
    fireEvent.press(getByText('Pilih'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ shift_definition_id: 'sd-3' }));
  });
});
