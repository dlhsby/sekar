/** Unit Tests: TimePicker — masking + normalize (no popover needed). */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TimePicker } from '../time-picker';

function Harness({ initial = '' }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return <TimePicker value={v} onValueChange={setV} />;
}

describe('TimePicker', () => {
  it('renders the provided value', () => {
    render(<Harness initial="08:00" />);
    expect(screen.getByRole('textbox')).toHaveValue('08:00');
  });

  it('auto-inserts the colon while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, '0930');
    expect(input).toHaveValue('09:30');
  });

  it('normalizes out-of-range input on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, '9999');
    await user.tab();
    expect(input).toHaveValue('23:59');
  });

  it('emits the raw value through onValueChange', async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    render(<TimePicker value="" onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox'), '7');
    expect(onValueChange).toHaveBeenCalled();
  });
});
