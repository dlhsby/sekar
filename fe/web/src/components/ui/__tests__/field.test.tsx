/** Unit Tests: Field */
import { render, screen } from '@testing-library/react';

import { Field } from '../field';

describe('Field', () => {
  it('renders the label and a required marker', () => {
    render(
      <Field label="Nama" required>
        <input aria-label="nama-input" />
      </Field>
    );
    expect(screen.getByText('Nama')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows an error message with role=alert', () => {
    render(
      <Field label="Email" error="Wajib diisi">
        <input aria-label="email-input" />
      </Field>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Wajib diisi');
  });

  it('shows a hint when there is no error', () => {
    render(
      <Field label="Email" hint="Gunakan email kantor">
        <input aria-label="email-input" />
      </Field>
    );
    expect(screen.getByText('Gunakan email kantor')).toBeInTheDocument();
  });

  it('wires control props through a render-prop child', () => {
    render(
      <Field label="Tanggal" error="Salah">
        {(p) => <input data-testid="ctl" id={p.id} aria-describedby={p['aria-describedby']} aria-invalid={p['aria-invalid']} />}
      </Field>
    );
    const ctl = screen.getByTestId('ctl');
    expect(ctl).toHaveAttribute('aria-invalid', 'true');
    expect(ctl).toHaveAttribute('id');
    expect(ctl.getAttribute('aria-describedby')).toBe(`${ctl.id}-message`);
  });
});
