/**
 * Unit Tests: what a roster write refreshes, and WHEN it reports success.
 *
 * The Jadwal complaint that started this was "the success toast shows first,
 * and the schedule appears in the table 5–10 seconds later". Two causes, both
 * pinned here:
 *
 *  1. The mutations invalidated `scheduleOccurrenceKeys.lists()`, which does not
 *     cover the day summary — the collapsed board's counts live under a sibling
 *     key, so a create left every headcount showing the pre-write number.
 *  2. Nothing awaited the refetch, so `mutateAsync` resolved while the board was
 *     still stale and the caller toasted over a screen that had not changed yet.
 */
import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import {
  scheduleEventKeys,
  scheduleOccurrenceKeys,
  useCreateScheduleEvent,
} from '../schedule-events';
import { useUpdateRosterShift } from '../schedules';
import { unscheduledKeys } from '../unscheduled';

describe('roster write invalidation', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;
  let invalidated: unknown[][];

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidated = [];
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation((filters?: { queryKey?: readonly unknown[] }) => {
        invalidated.push([...(filters?.queryKey ?? [])]);
        return Promise.resolve();
      });
  });

  afterEach(() => {
    mockAxios.restore();
    jest.restoreAllMocks();
  });

  /** Was `key` (or a prefix of it) invalidated? */
  const sawKey = (key: readonly unknown[]) =>
    invalidated.some((k) => JSON.stringify(k) === JSON.stringify(key));

  it('creating an event refreshes the rows, the SUMMARY and the gap panel', async () => {
    mockAxios.onPost('/schedule-events').reply(201, { event: { id: 'e1' } });

    const { result } = renderHook(() => useCreateScheduleEvent(), { wrapper });
    await result.current.mutateAsync({
      shift_definition_id: 's1',
      scope: 'city',
      recurrence_type: 'none',
      start_date: '2026-08-05',
    } as never);

    await waitFor(() => expect(invalidated.length).toBeGreaterThan(0));
    expect(sawKey(scheduleEventKeys.lists())).toBe(true);
    // `.all`, NOT `.lists()` — the day summary hangs off `all` and would
    // otherwise keep serving the pre-write counts.
    expect(sawKey(scheduleOccurrenceKeys.all)).toBe(true);
    expect(sawKey(unscheduledKeys.all)).toBe(true);
  });

  it('editing a roster row refreshes the board, not only the daily-roster cache', async () => {
    mockAxios.onPatch('/schedules/row-1/shift').reply(200, { id: 'row-1' });

    const { result } = renderHook(() => useUpdateRosterShift(), { wrapper });
    await result.current.mutateAsync({ id: 'row-1', shift_definition_id: 's2' });

    await waitFor(() => expect(invalidated.length).toBeGreaterThan(0));
    expect(sawKey(scheduleOccurrenceKeys.all)).toBe(true);
    expect(sawKey(unscheduledKeys.all)).toBe(true);
  });

  it('does not resolve until the refetch has settled, so the toast cannot lie', async () => {
    mockAxios.onPost('/schedule-events').reply(201, { event: { id: 'e1' } });

    // Hold the invalidation open; the mutation must not settle behind it.
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    (queryClient.invalidateQueries as jest.Mock).mockImplementation(() => gate);

    const { result } = renderHook(() => useCreateScheduleEvent(), { wrapper });
    let settled = false;
    const pending = result.current
      .mutateAsync({
        shift_definition_id: 's1',
        scope: 'city',
        recurrence_type: 'none',
        start_date: '2026-08-05',
      } as never)
      .then(() => {
        settled = true;
      });

    // The POST has answered by now, but the board is still stale.
    await new Promise((r) => setTimeout(r, 50));
    expect(settled).toBe(false);

    release();
    await pending;
    expect(settled).toBe(true);
  });
});
