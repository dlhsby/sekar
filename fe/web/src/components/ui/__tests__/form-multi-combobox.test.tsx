/** Unit Tests: FormMultiCombobox */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormMultiCombobox } from '../form-multi-combobox';
import type { ComboboxOption } from '../combobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'tb', label: 'Taman Bungkul' },
  { value: 'tm', label: 'Taman Mundu' },
  { value: 'tp', label: 'Taman Prestasi' },
];

function Harness() {
  const [values, setValues] = useState<string[]>([]);
  return (
    <FormMultiCombobox
      label="Area"
      options={OPTIONS}
      values={values}
      onChange={setValues}
      placeholder="Pilih area"
    />
  );
}

describe('FormMultiCombobox', () => {
  it('shows the placeholder and label when nothing is selected', () => {
    render(<Harness />);
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Pilih area');
  });

  it('selects multiple options and renders removable chips', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Taman Bungkul' }));
    await user.click(screen.getByRole('option', { name: 'Taman Mundu' }));

    // Trigger reflects the count; both chips render their remove buttons.
    expect(screen.getByRole('combobox')).toHaveTextContent('2 dipilih');
    expect(screen.getByRole('button', { name: 'Hapus Taman Bungkul' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus Taman Mundu' })).toBeInTheDocument();

    // Removing a chip deselects it.
    await user.click(screen.getByRole('button', { name: 'Hapus Taman Bungkul' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('1 dipilih');
  });

  it('filters options by the search query', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Cari…'), 'mundu');

    expect(screen.getByRole('option', { name: 'Taman Mundu' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Taman Bungkul' })).not.toBeInTheDocument();
  });
});
