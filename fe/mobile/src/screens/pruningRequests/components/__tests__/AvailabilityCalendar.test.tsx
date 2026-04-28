/**
 * AvailabilityCalendar render + interaction tests (Round 4).
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../constants/nbTokens', () => {
  const handler = {
    get: (_target: any, prop: any) => {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return Number(prop) * 4;
      }
      return '#000000';
    },
  };
  return {
    nbColors: new Proxy({}, handler),
    nbSpacing: new Proxy({}, handler),
    nbBorders: { thin: 1, base: 2, thick: 3, extra: 4 },
    nbBorderRadius: new Proxy({}, handler),
  };
});

import { AvailabilityCalendar } from '../AvailabilityCalendar';
import { getISOWeek } from '../../../../utils/dateUtils';

describe('AvailabilityCalendar', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  function isoFor(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  it('refuses to select a full day', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSelect = jest.fn();
    const { week, year } = getISOWeek(tomorrow);
    const rows = [
      {
        year,
        iso_week: week,
        capacity_units: 10,
        booked_units: 10,
        service_type: 'pruning',
      },
    ];

    const { getByLabelText } = render(
      <AvailabilityCalendar
        rows={rows}
        selectedDate={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByLabelText(`Tanggal ${isoFor(tomorrow)} status full`));

    expect(alertSpy).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('selects an available day', () => {
    const onSelect = jest.fn();
    const { week, year } = getISOWeek(tomorrow);
    const rows = [
      {
        year,
        iso_week: week,
        capacity_units: 10,
        booked_units: 0,
        service_type: 'pruning',
      },
    ];

    const { getByLabelText } = render(
      <AvailabilityCalendar
        rows={rows}
        selectedDate={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByLabelText(`Tanggal ${isoFor(tomorrow)} status available`));
    expect(onSelect).toHaveBeenCalledWith(isoFor(tomorrow));
  });

  it('alerts on unknown (admin not configured) day', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <AvailabilityCalendar rows={[]} selectedDate={null} onSelect={onSelect} />,
    );

    fireEvent.press(getByLabelText(`Tanggal ${isoFor(tomorrow)} status unknown`));
    expect(alertSpy).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
