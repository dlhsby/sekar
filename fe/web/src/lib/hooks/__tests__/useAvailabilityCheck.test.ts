import { renderHook, waitFor } from '@testing-library/react';
import { useAvailabilityCheck } from '../useAvailabilityCheck';

describe('useAvailabilityCheck', () => {
  it('is idle for an empty value and never calls check', () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useAvailabilityCheck({ value: '', check, debounceMs: 5 }));
    expect(result.current).toBe('idle');
    expect(check).not.toHaveBeenCalled();
  });

  it('resolves to available after the debounce', async () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useAvailabilityCheck({ value: 'newname', check, debounceMs: 5 }),
    );
    await waitFor(() => expect(result.current).toBe('available'));
    expect(check).toHaveBeenCalledWith('newname');
  });

  it('resolves to taken when the value is not available', async () => {
    const check = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useAvailabilityCheck({ value: 'taken', check, debounceMs: 5 }),
    );
    await waitFor(() => expect(result.current).toBe('taken'));
  });

  it('marks invalid (no network call) when the format predicate fails', () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useAvailabilityCheck({
        value: 'bad value!',
        check,
        isValidFormat: (v) => /^[a-z]+$/.test(v),
        debounceMs: 5,
      }),
    );
    expect(result.current).toBe('invalid');
    expect(check).not.toHaveBeenCalled();
  });

  it('stays idle below minLength', () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useAvailabilityCheck({ value: 'a', check, minLength: 2, debounceMs: 5 }),
    );
    expect(result.current).toBe('idle');
    expect(check).not.toHaveBeenCalled();
  });

  it('stays idle when the value is unchanged (edit mode)', () => {
    const check = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useAvailabilityCheck({
        value: 'same',
        check,
        isUnchanged: (v) => v === 'same',
        debounceMs: 5,
      }),
    );
    expect(result.current).toBe('idle');
    expect(check).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useAvailabilityCheck({ value: 'x', check, enabled: false, debounceMs: 5 }),
    );
    expect(result.current).toBe('idle');
    expect(check).not.toHaveBeenCalled();
  });

  it('normalizes before checking', async () => {
    const check = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useAvailabilityCheck({
        value: '  ABC ',
        check,
        normalize: (v) => v.toLowerCase(),
        debounceMs: 5,
      }),
    );
    await waitFor(() => expect(result.current).toBe('available'));
    expect(check).toHaveBeenCalledWith('abc');
  });
});
