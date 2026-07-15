/**
 * Unit tests: CreateButton — the standard primary [+ Tambah X] action.
 *
 * The point of this component is one rule: the label is hidden below `sm`, the
 * same way the table's filter/columns/refresh buttons already behave. Without
 * it, a labelled create button was wide enough to wrap onto its own line on a
 * phone, so every list page stacked search / tools / create as three rows.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateButton } from '../create-button';

describe('CreateButton', () => {
  it('keeps the label reachable when it is visually hidden on mobile', () => {
    render(<CreateButton label="Tambah Rayon" onClick={jest.fn()} />);

    // aria-label carries it, so the icon-only form is still announced and
    // findable by name — the button must not become an anonymous icon.
    expect(screen.getByRole('button', { name: 'Tambah Rayon' })).toBeInTheDocument();
  });

  it('hides the label text below sm, and shows it from sm up', () => {
    render(<CreateButton label="Tambah Rayon" onClick={jest.fn()} />);

    const label = screen.getByText('Tambah Rayon');
    expect(label).toHaveClass('hidden');
    expect(label).toHaveClass('sm:inline');
  });

  it('fires onClick', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<CreateButton label="Tambah" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<CreateButton label="Tambah" onClick={onClick} disabled />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
