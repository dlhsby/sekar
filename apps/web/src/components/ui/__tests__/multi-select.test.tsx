/**
 * MultiSelect — checkboxes in a dropdown, for toolbars rather than forms.
 *
 * The behaviour worth pinning is the trigger summary and the all-row's mixed
 * state: both exist so an operator can read a control's state without opening
 * it, and both are easy to regress into something that merely looks right.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelect } from '../multi-select';

const OPTIONS = [
  { value: 'boundary', label: 'Batas' },
  { value: 'fill', label: 'Isian' },
  { value: 'marker', label: 'Marker' },
];

const setup = (values: string[], onChange = jest.fn()) => {
  render(
    <MultiSelect
      options={OPTIONS}
      values={values}
      onChange={onChange}
      ariaLabel="Rayon"
      allLabel="Semua"
      noneLabel="Tidak ada"
    />
  );
  return { onChange, trigger: screen.getByRole('combobox', { name: 'Rayon' }) };
};

describe('the closed trigger', () => {
  it('names the chosen options, so the state is readable without opening it', () => {
    const { trigger } = setup(['boundary', 'marker']);
    expect(trigger).toHaveTextContent('Batas, Marker');
  });

  it('collapses a full selection to one word rather than listing everything', () => {
    const { trigger } = setup(['boundary', 'fill', 'marker']);
    expect(trigger).toHaveTextContent('Semua');
    expect(trigger).not.toHaveTextContent('Batas');
  });

  it('says so when nothing is selected', () => {
    const { trigger } = setup([]);
    expect(trigger).toHaveTextContent('Tidak ada');
  });

  it('lists options in the component\'s order, not the selection\'s', () => {
    // Otherwise the summary reshuffles as the operator ticks boxes, and the
    // same state reads differently depending on the order it was reached in.
    const { trigger } = setup(['marker', 'boundary']);
    expect(trigger).toHaveTextContent('Batas, Marker');
  });
});

describe('the dropdown', () => {
  it('toggles a single option without disturbing the others', () => {
    const { onChange, trigger } = setup(['boundary']);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByLabelText('Isian'));
    expect(onChange).toHaveBeenCalledWith(['boundary', 'fill']);
  });

  it('unticks an option that was on', () => {
    const { onChange, trigger } = setup(['boundary', 'fill']);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByLabelText('Batas'));
    expect(onChange).toHaveBeenCalledWith(['fill']);
  });

  it('shows the all-row as MIXED for a partial selection', () => {
    // Not unchecked: a partial selection is neither on nor off, and showing it
    // as off would misreport the tier's state at a glance.
    const { trigger } = setup(['boundary']);
    fireEvent.click(trigger);
    const all = screen.getByLabelText('Semua') as HTMLInputElement;
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
  });

  it('selects everything from the all-row, and clears from it when full', () => {
    // The shortcut writes exactly the set the boxes do, so the two can never
    // disagree — the reason it is a checkbox and not a pair of links.
    const partial = setup(['boundary']);
    fireEvent.click(partial.trigger);
    fireEvent.click(screen.getByLabelText('Semua'));
    expect(partial.onChange).toHaveBeenCalledWith(['boundary', 'fill', 'marker']);
  });

  it('clears everything when the all-row is already checked', () => {
    const full = setup(['boundary', 'fill', 'marker']);
    fireEvent.click(full.trigger);
    fireEvent.click(screen.getByLabelText('Semua'));
    expect(full.onChange).toHaveBeenCalledWith([]);
  });

  it('does not open when disabled', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        values={[]}
        onChange={jest.fn()}
        ariaLabel="Rayon"
        allLabel="Semua"
        noneLabel="Tidak ada"
        disabled
      />
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Rayon' }));
    expect(screen.queryByLabelText('Batas')).toBeNull();
  });
});
