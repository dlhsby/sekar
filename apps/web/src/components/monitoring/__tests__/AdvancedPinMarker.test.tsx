/**
 * Unit tests: AdvancedPinMarker — the reposition-on-patch primitive. Its DOM
 * `content` is memoized by `signature` (position excluded), so a move-only patch
 * keeps the same element object (the marker just repositions) while a visual change
 * rebuilds it. This is what keeps hundreds of live pins smooth on Advanced Markers.
 */
import { render } from '@testing-library/react';
import { AdvancedPinMarker } from '../AdvancedPinMarker';

const contents: HTMLElement[] = [];
jest.mock('@/components/maps/AdvancedMarker', () => ({
  AdvancedMarker: ({ content }: { content: HTMLElement }) => {
    contents.push(content);
    return <div data-testid="marker" />;
  },
}));

beforeEach(() => {
  contents.length = 0;
});

describe('AdvancedPinMarker', () => {
  it('reuses the same content element when only position changes (reposition-only)', () => {
    let calls = 0;
    const build = () => {
      calls++;
      return document.createElement('div');
    };
    const { rerender } = render(
      <AdvancedPinMarker position={{ lat: -7.2, lng: 112.7 }} signature="active" build={build} />
    );
    rerender(<AdvancedPinMarker position={{ lat: -7.3, lng: 112.8 }} signature="active" build={build} />);
    expect(calls).toBe(1); // build ran once; the moved marker did NOT rebuild content
    expect(contents[0]).toBe(contents[1]); // identical element object passed to the marker
  });

  it('rebuilds content when the signature changes', () => {
    let calls = 0;
    const build = () => {
      calls++;
      return document.createElement('div');
    };
    const { rerender } = render(
      <AdvancedPinMarker position={{ lat: -7.2, lng: 112.7 }} signature="active" build={build} />
    );
    rerender(<AdvancedPinMarker position={{ lat: -7.2, lng: 112.7 }} signature="offline" build={build} />);
    expect(calls).toBe(2); // signature changed → rebuilt
    expect(contents[0]).not.toBe(contents[1]);
  });
});
