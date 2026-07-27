/**
 * Unit tests: DateNav — the ‹ label › toolbar navigation.
 * Small, but every calendar range (day/week/month/year) drives off it; its
 * prev/next are icon-only so they rely on localized aria-labels, and the label
 * doubles as the date-picker trigger.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateNav } from '../DateNav';

function setup() {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  const onToday = jest.fn();
  const onValueChange = jest.fn();
  render(
    <DateNav
      label="13 Juli 2026"
      value="2026-07-13"
      onValueChange={onValueChange}
      onPrev={onPrev}
      onNext={onNext}
      onToday={onToday}
    />
  );
  return { onPrev, onNext, onToday, onValueChange };
}

describe('DateNav', () => {
  it('renders the contextual period label', () => {
    setup();
    expect(screen.getByText('13 Juli 2026')).toBeInTheDocument();
  });

  it('navigates back', async () => {
    const user = userEvent.setup();
    const { onPrev, onNext, onToday } = setup();

    await user.click(screen.getByRole('button', { name: /sebelumnya|prev/i }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
    expect(onToday).not.toHaveBeenCalled();
  });

  it('navigates forward', async () => {
    const user = userEvent.setup();
    const { onPrev, onNext } = setup();

    await user.click(screen.getByRole('button', { name: /berikutnya|next/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('has no standalone Hari Ini button — the picker owns that shortcut', () => {
    setup();

    // A second control for the same jump only widened the toolbar; Hari Ini now
    // lives inside the picker popover (not assertable here — Radix popovers do
    // not open under jsdom).
    expect(screen.queryByRole('button', { name: /^hari ini$|^today$/i })).not.toBeInTheDocument();
  });

  it('gives the icon-only arrows accessible names', () => {
    setup();
    // Regression guard: these were English-only fallbacks before being localized.
    expect(screen.getByRole('button', { name: /sebelumnya|prev/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /berikutnya|next/i })).toBeInTheDocument();
  });
  // The label used to sit AFTER both arrows and be inert text — jumping three
  // weeks out meant 21 clicks on ›.
  describe('the label as a date picker', () => {
    it('sits between the arrows', () => {
      setup();

      const prev = screen.getByRole('button', { name: /sebelumnya|prev/i });
      const next = screen.getByRole('button', { name: /berikutnya|next/i });
      const label = screen.getByText('13 Juli 2026');

      expect(prev.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(label.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('makes the label the picker trigger, with an accessible name', () => {
      setup();

      // The popover body itself is not assertable here — Radix popovers do not
      // open under jsdom (see the DatePicker unit test, which skips it too), so
      // the calendar interaction is covered manually / in e2e.
      const trigger = screen.getByRole('button', { name: /pilih tanggal|pick a date/i });
      expect(trigger).toHaveTextContent('13 Juli 2026');
    });

  });
});
