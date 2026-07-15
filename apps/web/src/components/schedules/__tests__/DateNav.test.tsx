/**
 * Unit tests: DateNav — the Today · ‹ › · label toolbar navigation.
 * Small, but every calendar range (day/week/month/year) drives off it, and its
 * prev/next are icon-only so they rely on localized aria-labels.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateNav } from '../DateNav';

function setup() {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  const onToday = jest.fn();
  render(
    <DateNav label="13 Juli 2026" onPrev={onPrev} onNext={onNext} onToday={onToday} />
  );
  return { onPrev, onNext, onToday };
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

  it('jumps to today', async () => {
    const user = userEvent.setup();
    const { onToday } = setup();

    await user.click(screen.getByRole('button', { name: /hari ini|today/i }));

    expect(onToday).toHaveBeenCalledTimes(1);
  });

  it('gives the icon-only arrows accessible names', () => {
    setup();
    // Regression guard: these were English-only fallbacks before being localized.
    expect(screen.getByRole('button', { name: /sebelumnya|prev/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /berikutnya|next/i })).toBeInTheDocument();
  });
});
