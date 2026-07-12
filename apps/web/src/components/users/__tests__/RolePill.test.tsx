/**
 * Unit Tests: RolePill — data-driven role accent (ADR-044).
 * A supplied `color` (role marker_color) drives an inline tint; without it the
 * fixed per-role token class applies. Custom role codes still render a label.
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- hex literals are the test fixtures */
import { render, screen } from '@testing-library/react';
import { RolePill } from '../RolePill';
import '@testing-library/jest-dom';

describe('RolePill', () => {
  it('renders the role label', () => {
    render(<RolePill role="satgas" />);
    expect(screen.getByText('Satgas')).toBeInTheDocument();
  });

  it('applies the fixed token class when no colour is given', () => {
    render(<RolePill role="satgas" />);
    const pill = screen.getByText('Satgas');
    expect(pill).toHaveClass('bg-role-satgas');
    expect(pill).not.toHaveStyle({ backgroundColor: '#7FBC8C' });
  });

  it('tints inline from a data-driven colour and drops the token class', () => {
    render(<RolePill role="satgas" color="#123ABC" />);
    const pill = screen.getByText('Satgas');
    expect(pill).toHaveStyle({ backgroundColor: '#123ABC' });
    expect(pill).not.toHaveClass('bg-role-satgas');
  });

  it('tints a custom role that has no fixed token', () => {
    render(<RolePill role="pengawas_taman" color="#7FBC8C" />);
    const pill = screen.getByText('Pengawas Taman');
    expect(pill).toHaveStyle({ backgroundColor: '#7FBC8C' });
  });
});
