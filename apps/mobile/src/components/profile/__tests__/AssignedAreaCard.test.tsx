/**
 * AssignedAreaCard tests — area name, type·radius meta, address, and empty state.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AssignedAreaCard } from '../AssignedAreaCard';

describe('AssignedAreaCard', () => {
  it('renders the section title', () => {
    const { getByText } = render(<AssignedAreaCard area={null} />);
    expect(getByText('Area Ditugaskan')).toBeTruthy();
  });

  it('renders the area name', () => {
    const { getByText } = render(
      <AssignedAreaCard area={{ name: 'Taman Bungkul', area_type: { name: 'Taman Kota' } }} />,
    );
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });

  it('shows the lokasi type', () => {
    const { getByText } = render(
      <AssignedAreaCard area={{ name: 'Taman Bungkul', area_type: { name: 'Taman Kota' } }} />,
    );
    expect(getByText('Taman Kota')).toBeTruthy();
  });

  it('renders the address when present', () => {
    const { getByText } = render(
      <AssignedAreaCard area={{ name: 'Taman Bungkul', address: 'Jl. Raya Darmo' }} />,
    );
    expect(getByText('Jl. Raya Darmo')).toBeTruthy();
  });

  it('omits the meta line when no type/radius given', () => {
    const { queryByText } = render(<AssignedAreaCard area={{ name: 'Taman X' }} />);
    expect(queryByText(/radius/)).toBeNull();
  });

  it('shows the empty state when area is null', () => {
    const { getByText } = render(<AssignedAreaCard area={null} />);
    expect(getByText('Tidak ada area ditugaskan')).toBeTruthy();
  });
});
