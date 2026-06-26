/** Unit Tests: Checkbox */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders an accessible checkbox with a label', () => {
    render(<Checkbox label="Setuju" />);
    expect(screen.getByRole('checkbox', { name: 'Setuju' })).toBeInTheDocument();
  });

  it('toggles via user click and fires onChange', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox label="Pilih" onChange={onChange} />);
    await user.click(screen.getByRole('checkbox', { name: 'Pilih' }));
    expect(onChange).toHaveBeenCalled();
  });

  it('reflects the controlled checked prop', () => {
    render(<Checkbox label="X" checked readOnly />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('sets the indeterminate DOM state', () => {
    render(<Checkbox label="X" indeterminate />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('is not clickable when disabled', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<Checkbox label="X" disabled onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
