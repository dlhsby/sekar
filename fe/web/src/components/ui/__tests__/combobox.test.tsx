/** Unit Tests: Combobox */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Combobox, type ComboboxOption } from '../combobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'tb', label: 'Taman Bungkul' },
  { value: 'tm', label: 'Taman Mundu' },
  { value: 'tp', label: 'Taman Prestasi' },
];

function Harness({ clearable = false }: { clearable?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <Combobox
      options={OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="Pilih area"
      clearable={clearable}
    />
  );
}

describe('Combobox', () => {
  it('renders the placeholder and combobox role', () => {
    render(<Harness />);
    const trigger = screen.getByRole('combobox', { expanded: false });
    expect(trigger).toHaveTextContent('Pilih area');
  });

  it('opens, filters by typed query, and selects an option', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { expanded: false }));
    const search = screen.getByPlaceholderText('Cari…');
    await user.type(search, 'mundu');
    // Only the matching option remains.
    expect(screen.getByRole('option', { name: /taman mundu/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /taman bungkul/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /taman mundu/i }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Taman Mundu');
  });

  it('selects the active option via keyboard (ArrowDown + Enter)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { expanded: false }));
    const search = screen.getByPlaceholderText('Cari…');
    await user.type(search, '{ArrowDown}{Enter}');
    // activeIndex starts at 0; one ArrowDown → index 1 (Taman Mundu).
    expect(screen.getByRole('combobox')).toHaveTextContent('Taman Mundu');
  });

  it('shows the empty text when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { expanded: false }));
    await user.type(screen.getByPlaceholderText('Cari…'), 'zzz');
    expect(screen.getByText('Tidak ditemukan')).toBeInTheDocument();
  });

  it('clears the selection when clearable', async () => {
    const user = userEvent.setup();
    render(<Harness clearable />);
    await user.click(screen.getByRole('combobox', { expanded: false }));
    await user.click(screen.getByRole('option', { name: /taman bungkul/i }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Taman Bungkul');
    await user.click(screen.getByRole('button', { name: 'Hapus pilihan' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Pilih area');
  });

  it('exposes an aria-label on the trigger when provided', () => {
    render(
      <Combobox options={OPTIONS} value="" onValueChange={() => {}} aria-label="Ke area" />
    );
    expect(screen.getByRole('combobox', { name: 'Ke area' })).toBeInTheDocument();
  });
});
