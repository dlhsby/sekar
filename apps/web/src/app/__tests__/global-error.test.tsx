/**
 * Unit Tests: GlobalError (App Router global error boundary)
 * Reports to Sentry and renders an NB fallback with a working retry.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../global-error';

const mockCaptureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe('GlobalError', () => {
  afterEach(() => jest.clearAllMocks());

  it('reports the error to Sentry on mount', () => {
    const error = new Error('boom');
    render(<GlobalError error={error} reset={jest.fn()} />);
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it('renders the fallback message', () => {
    render(<GlobalError error={new Error('boom')} reset={jest.fn()} />);
    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument();
  });

  it('calls reset when the retry button is clicked', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
