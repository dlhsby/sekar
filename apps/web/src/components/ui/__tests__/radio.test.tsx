/** Unit Tests: Radio */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Radio } from '../radio';

describe('Radio', () => {
  it('renders an accessible radio with a label', () => {
    render(<Radio name="g" label="Opsi A" value="a" />);
    expect(screen.getByRole('radio', { name: 'Opsi A' })).toBeInTheDocument();
  });

  it('selects within a group', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Radio name="g" label="A" value="a" />
        <Radio name="g" label="B" value="b" />
      </>
    );
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
  });

  it('does not select when disabled', async () => {
    const user = userEvent.setup();
    render(<Radio name="g" label="A" value="a" disabled />);
    await user.click(screen.getByRole('radio', { name: 'A' }));
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
  });
});
