/**
 * Unit Tests: Import API hooks (Phase 4-5)
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import {
  useValidateCsv,
  useConfirmCsvImport,
  downloadCsvTemplate,
  useUploadKmz,
  useConfirmKmz,
} from '../import';

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const csvFile = new File(['username,full_name'], 'users.csv', { type: 'text/csv' });
const kmzFile = new File(['<kml/>'], 'areas.kmz', { type: 'application/vnd.google-earth.kmz' });

describe('Import API', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => mock.restore());

  it('validates a users CSV', async () => {
    mock.onPost('/import/users/csv').reply(201, { validCount: 2, errors: [], sessionId: 'sess-1' });

    const { result } = renderHook(() => useValidateCsv(), { wrapper });
    let response;
    await act(async () => {
      response = await result.current.mutateAsync({ entity: 'users', file: csvFile });
    });

    expect(response).toMatchObject({ validCount: 2, sessionId: 'sess-1' });
  });

  it('commits a CSV import session', async () => {
    mock.onPost('/import/confirm/sess-1').reply(201, { imported: 5, skipped: 0 });

    const { result } = renderHook(() => useConfirmCsvImport(), { wrapper });
    let response;
    await act(async () => {
      response = await result.current.mutateAsync('sess-1');
    });

    expect(response).toEqual({ imported: 5, skipped: 0 });
  });

  it('downloads a CSV template', async () => {
    mock.onGet('/import/template/users').reply(200, new Blob(['username']));
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadCsvTemplate('users');

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('uploads a KMZ file and returns the preview', async () => {
    mock.onPost('/import/kmz/upload').reply(201, {
      session_id: 'kmz-1',
      total_locations: 1,
      new_areas: 1,
      update_areas: 0,
      areas: [],
      expires_at: '2026-06-10T01:00:00.000Z',
    });

    const { result } = renderHook(() => useUploadKmz(), { wrapper });
    let response;
    await act(async () => {
      response = await result.current.mutateAsync(kmzFile);
    });

    expect(response).toMatchObject({ session_id: 'kmz-1', new_areas: 1 });
  });

  it('confirms a KMZ import', async () => {
    mock
      .onPost('/import/kmz/confirm')
      .reply(201, { total_processed: 1, created: 1, updated: 0, skipped: 0, failed: 0 });

    const { result } = renderHook(() => useConfirmKmz(), { wrapper });
    let response;
    await act(async () => {
      response = await result.current.mutateAsync({
        sessionId: 'kmz-1',
        areas: [{ index: 0, action: 'create', location_type_id: 't1', rayon_id: 'r1' }],
      });
    });

    expect(response).toMatchObject({ created: 1 });
  });
});
