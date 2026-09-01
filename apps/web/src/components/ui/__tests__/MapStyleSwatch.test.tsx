import { render, screen } from '@testing-library/react';
import { MapStyleSwatch } from '../MapStyleSwatch';

// Sentinel (non-hex) colour strings — the lint rule forbids hex literals and the
// swatch echoes whatever colour string it's given, so these still verify that
// both border/fill colours + their opacities render.
describe('MapStyleSwatch', () => {
  it('shows both border and fill colours with their opacity as a percentage', () => {
    render(
      <MapStyleSwatch
        border_color="border-sentinel"
        fill_color="fill-sentinel"
        border_opacity={0.8}
        fill_opacity={0.5}
      />
    );
    expect(screen.getByText('border-sentinel')).toBeInTheDocument();
    expect(screen.getByText('fill-sentinel')).toBeInTheDocument();
    expect(screen.getByText('· 80%')).toBeInTheDocument();
    expect(screen.getByText('· 50%')).toBeInTheDocument();
  });

  it('defaults a missing opacity to 100%', () => {
    render(<MapStyleSwatch border_color="border-sentinel" />);
    expect(screen.getByText('· 100%')).toBeInTheDocument();
  });

  it('renders a dash when no colours are set', () => {
    render(<MapStyleSwatch />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
