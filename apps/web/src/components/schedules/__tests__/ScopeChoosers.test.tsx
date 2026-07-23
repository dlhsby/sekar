/**
 * Unit tests: EditScopeChooser + DeleteScopeChooser.
 *
 * These drive destructive/wide-reaching writes (this / this-and-future / whole
 * series), so the exact (scope, date) payload matters: `this_and_future` MUST
 * carry the selected date or the split happens at the wrong point, and
 * `hideThisOption` MUST hide "Hanya hari ini" for a projected occurrence (which
 * has no materialized row to edit or delete on its own).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditScopeChooser } from '../EditScopeChooser';
import { DeleteScopeChooser } from '../DeleteScopeChooser';

const DATE = '2026-07-13';

describe('EditScopeChooser', () => {
  const setup = (props: Partial<React.ComponentProps<typeof EditScopeChooser>> = {}) => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <EditScopeChooser
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        selectedDate={DATE}
        {...props}
      />
    );
    return { onSelect, onOpenChange };
  };

  it('selects "this" WITHOUT self-closing — the caller closes once the write lands', async () => {
    const user = userEvent.setup();
    const { onSelect, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: /hanya hari ini/i }));

    expect(onSelect).toHaveBeenCalledWith('this');
    // Answering this dialog is what PERSISTS the edit. Closing on click would
    // hide the spinner and, on failure, dismiss the only actionable surface.
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('locks every choice while a scope is being applied', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup({ pendingScope: 'series' });

    // Mid-write: no second choice, and no cancel that would orphan the request.
    await user.click(screen.getByRole('button', { name: /hanya hari ini/i }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
  });

  it('passes the selected date with "this and future" (the split point)', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole('button', { name: /hari ini & seterusnya/i }));

    expect(onSelect).toHaveBeenCalledWith('this_and_future', DATE);
  });

  it('selects the whole series', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole('button', { name: /seluruh rangkaian/i }));

    expect(onSelect).toHaveBeenCalledWith('series');
  });

  it('hides "this" for a projected occurrence', () => {
    setup({ hideThisOption: true });

    expect(screen.queryByRole('button', { name: /hanya hari ini/i })).not.toBeInTheDocument();
    // The wider scopes remain available.
    expect(screen.getByRole('button', { name: /hari ini & seterusnya/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /seluruh rangkaian/i })).toBeInTheDocument();
  });

  it('goes BACK to the form without selecting a scope', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const { onSelect } = setup({ onBack });

    await user.click(screen.getByRole('button', { name: /^kembali$/i }));

    expect(onBack).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('never offers DELETE mid-edit — that belongs to the row detail modal', () => {
    // Asking "delete?" part-way through an edit answers a question the user did
    // not ask, and used to sit where Kembali does now.
    setup({ onBack: jest.fn() });
    expect(screen.queryByRole('button', { name: /^hapus$/i })).not.toBeInTheDocument();
  });

  it('cancel closes without selecting a scope', async () => {
    const user = userEvent.setup();
    const { onSelect, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: /batal/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('DeleteScopeChooser', () => {
  const setup = (props: Partial<React.ComponentProps<typeof DeleteScopeChooser>> = {}) => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <DeleteScopeChooser
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        selectedDate={DATE}
        {...props}
      />
    );
    return { onSelect, onOpenChange };
  };

  it('asks for confirmation', () => {
    setup();
    expect(screen.getByText(/hapus jadwal ini\?/i)).toBeInTheDocument();
  });

  it('deletes only this occurrence, carrying its date (tombstone target)', async () => {
    const user = userEvent.setup();
    const { onSelect, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: /hanya hari ini/i }));

    // Unlike the edit chooser, delete's "this" needs the date to tombstone.
    expect(onSelect).toHaveBeenCalledWith('this', DATE);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('passes the selected date with "this and future"', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole('button', { name: /hari ini & seterusnya/i }));

    expect(onSelect).toHaveBeenCalledWith('this_and_future', DATE);
  });

  it('deletes the whole series without a date', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole('button', { name: /seluruh rangkaian/i }));

    expect(onSelect).toHaveBeenCalledWith('series');
  });

  it('hides "this" for a projected occurrence', () => {
    setup({ hideThisOption: true });

    expect(screen.queryByRole('button', { name: /hanya hari ini/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /seluruh rangkaian/i })).toBeInTheDocument();
  });

  it('cancel closes without deleting anything', async () => {
    const user = userEvent.setup();
    const { onSelect, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: /batal/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
