import React from 'react';
import { render } from '@testing-library/react-native';
import { ScheduleDetailSheet } from '../ScheduleDetailSheet';

const baseRoster: any = {
  id: 'roster-1',
  user_id: 'user-1',
  schedule_date: '2026-07-24',
  status: 'planned',
  shift_definition: {
    id: 'shift-3',
    name: 'Shift 3',
    start_time: '21:00:00',
    end_time: '05:00:00',
  },
};

describe('ScheduleDetailSheet', () => {
  it('renders the sheet title and shift window for a location-scoped roster', () => {
    const roster = {
      ...baseRoster,
      location_id: 'loc-1',
      location: { id: 'loc-1', name: 'Taman Bungkul', address: 'Jl. Raya Darmo' },
    };
    const { getByText } = render(
      <ScheduleDetailSheet visible roster={roster} onClose={jest.fn()} />,
    );

    expect(getByText('Detail Jadwal')).toBeTruthy();
    expect(getByText('Shift 3')).toBeTruthy();
    expect(getByText('21:00–05:00')).toBeTruthy();
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });

  it('shows the scope label (not "no area") for a rayon-scoped roster', () => {
    const roster = {
      ...baseRoster,
      district_id: 'd-1',
      district: { id: 'd-1', name: 'Rayon Barat 1' },
    };
    const { getByText, queryByText } = render(
      <ScheduleDetailSheet visible roster={roster} onClose={jest.fn()} />,
    );

    // Assigned-area row resolves to the rayon scope label, and the rayon name
    // appears in its own district row.
    expect(getByText('Lingkup Rayon Rayon Barat 1')).toBeTruthy();
    expect(getByText('Rayon Barat 1')).toBeTruthy();
    expect(queryByText('Area belum ditetapkan')).toBeNull();
  });
});
