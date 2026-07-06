/** Unit Tests: DatePicker — masked field display + parse (no popover needed). */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DatePicker } from '../date-picker';

describe('DatePicker', () => {
  it('renders an ISO value as dd/MM/yyyy', () => {
    render(<DatePicker value="2026-06-24" onValueChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('24/06/2026');
  });

  it('parses a typed date to ISO on blur', async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    render(<DatePicker onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '15032026');
    expect(input).toHaveValue('15/03/2026'); // auto-masked
    await user.tab();
    expect(onValueChange).toHaveBeenCalledWith('2026-03-15');
  });

  it('clears the value when the field is emptied', async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    render(<DatePicker value="2026-06-24" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.tab();
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it('reverts unparseable input on blur', async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    render(<DatePicker value="2026-06-24" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '99');
    await user.tab();
    // No valid date emitted; display reverts to the prior value.
    expect(onValueChange).not.toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-/));
    expect(input).toHaveValue('24/06/2026');
  });
});
