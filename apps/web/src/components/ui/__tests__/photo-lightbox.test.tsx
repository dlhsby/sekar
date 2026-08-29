/**
 * Unit Tests: PhotoLightbox
 *
 * Covers the two things the extraction was for: a single-photo caller gets the
 * plain dialog it had (no navigation chrome), and a multi-photo caller gets
 * stepping — which the pruning page lacked entirely before this component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PhotoLightbox } from '../photo-lightbox';

const PHOTOS = ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg', 'https://cdn.test/c.jpg'];

describe('PhotoLightbox', () => {
  it('renders nothing when index is null', () => {
    render(<PhotoLightbox photos={PHOTOS} index={null} onIndexChange={jest.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the photo at the given index', () => {
    render(<PhotoLightbox photos={PHOTOS} index={1} onIndexChange={jest.fn()} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', PHOTOS[1]);
  });

  it('hides navigation for a single photo', () => {
    render(<PhotoLightbox photos={[PHOTOS[0]]} index={0} onIndexChange={jest.fn()} />);
    expect(screen.queryByTestId('lightbox-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lightbox-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lightbox-counter')).not.toBeInTheDocument();
  });

  it('shows a counter and navigation for several photos', () => {
    render(<PhotoLightbox photos={PHOTOS} index={0} onIndexChange={jest.fn()} />);
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');
    expect(screen.getByTestId('lightbox-next')).toBeInTheDocument();
  });

  it('steps forward', async () => {
    const user = userEvent.setup();
    const onIndexChange = jest.fn();
    render(<PhotoLightbox photos={PHOTOS} index={0} onIndexChange={onIndexChange} />);

    await user.click(screen.getByTestId('lightbox-next'));

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('wraps from the last photo back to the first', async () => {
    const user = userEvent.setup();
    const onIndexChange = jest.fn();
    render(<PhotoLightbox photos={PHOTOS} index={2} onIndexChange={onIndexChange} />);

    await user.click(screen.getByTestId('lightbox-next'));

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('wraps backwards from the first photo to the last', async () => {
    const user = userEvent.setup();
    const onIndexChange = jest.fn();
    render(<PhotoLightbox photos={PHOTOS} index={0} onIndexChange={onIndexChange} />);

    await user.click(screen.getByTestId('lightbox-prev'));

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('steps with the arrow keys', async () => {
    const user = userEvent.setup();
    const onIndexChange = jest.fn();
    render(<PhotoLightbox photos={PHOTOS} index={1} onIndexChange={onIndexChange} />);

    await user.keyboard('{ArrowRight}');
    expect(onIndexChange).toHaveBeenCalledWith(2);

    await user.keyboard('{ArrowLeft}');
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  /** An index past the end must not render a broken <img src="undefined">. */
  it('treats an out-of-range index as closed', () => {
    render(<PhotoLightbox photos={PHOTOS} index={9} onIndexChange={jest.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
