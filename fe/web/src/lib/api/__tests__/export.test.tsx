/**
 * Unit Tests: Export API hooks (Phase 4-5)
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import { useExportData, useExportJobs, useExportJob, type ExportJob } from '../export';

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const sampleJob: ExportJob = {
  jobId: 'job-1',
  status: 'processing',
  entityType: 'users',
  format: 'csv',
  rowCount: 9000,
  createdAt: '2026-06-10T00:00:00.000Z',
};

describe('Export API', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    // jsdom lacks object-URL + anchor download plumbing.
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => mock.restore());

  it('downloads inline for a sync (200) export', async () => {
    mock.onPost('/export').reply(200, new Blob(['id,name']), {
      'content-disposition': 'attachment; filename="users-2026-06-10.csv"',
    });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { result } = renderHook(() => useExportData(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.mutateAsync({ entityType: 'users', format: 'csv' });
    });

    expect(outcome).toEqual({ kind: 'downloaded', filename: 'users-2026-06-10.csv' });
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('returns a job for an async (202) export', async () => {
    mock.onPost('/export').reply(202, new Blob([JSON.stringify(sampleJob)]));

    const { result } = renderHook(() => useExportData(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.mutateAsync({ entityType: 'users' });
    });

    expect(outcome).toEqual({ kind: 'job', job: sampleJob });
  });

  it('lists export jobs', async () => {
    mock.onGet('/export/jobs').reply(200, [sampleJob]);

    const { result } = renderHook(() => useExportJobs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('fetches a single job when an id is provided', async () => {
    mock.onGet('/export/jobs/job-1').reply(200, { ...sampleJob, status: 'completed', downloadUrl: 'https://s3/x' });

    const { result } = renderHook(() => useExportJob('job-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.downloadUrl).toBe('https://s3/x');
  });

  it('does not fetch when job id is null', () => {
    const { result } = renderHook(() => useExportJob(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
