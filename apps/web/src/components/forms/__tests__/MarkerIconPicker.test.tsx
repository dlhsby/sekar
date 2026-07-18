/**
 * Unit tests: MarkerIconPicker — the role marker glyph grid. Selecting a glyph
 * sets `marker_icon` (the shape drawn inside the live-status-colored worker pin).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerIconPicker } from '../MarkerIconPicker';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('MarkerIconPicker', () => {
  it('marks the current glyph as pressed', () => {
    render(<MarkerIconPicker value="shield" onChange={() => {}} />);
    expect(screen.getByLabelText('shield').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('hard-hat').getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the glyph name when one is clicked', () => {
    const onChange = jest.fn();
    render(<MarkerIconPicker value="user" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('crown'));
    expect(onChange).toHaveBeenCalledWith('crown');
  });

  it('disables every option when disabled', () => {
    render(<MarkerIconPicker value="user" onChange={() => {}} disabled />);
    expect(screen.getByLabelText('user')).toBeDisabled();
  });
});
