/**
 * UserAreasSheet — lazy-loads and lists a user's assigned areas, filterable.
 */
import MockAdapter from 'axios-mock-adapter';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { UserAreasSheet } from '../UserAreasSheet';

const renderSheet = (ui: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('UserAreasSheet', () => {
  let mockAxios: MockAdapter;
  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });
  afterEach(() => mockAxios.restore());

  // The endpoint returns areas with district_id (locationType is eager); the district name
  // is resolved client-side from GET /districts.
  const areas = [
    { id: 'a1', name: 'Jl. Ahmad Yani', district_id: 'r1', locationType: { name: 'Jalanan' } },
    { id: 'a2', name: 'Taman Bungkul', district_id: 'r2', locationType: { name: 'Taman' } },
  ];
  const districts = [
    { id: 'r1', name: 'Rayon Pusat' },
    { id: 'r2', name: 'Rayon Taman Aktif' },
  ];

  it('lazy-loads and lists the user areas with a count + district label', async () => {
    mockAxios.onGet('/users/u1/locations').reply(200, areas);
    mockAxios.onGet('/districts').reply(200, districts);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Jl. Ahmad Yani')).toBeInTheDocument());
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByText('2 lokasi')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    // district name resolved client-side from district_id
    expect(screen.getByText(/Rayon Taman Aktif · Taman/)).toBeInTheDocument();
  });

  it('filters the list by the search box', async () => {
    mockAxios.onGet('/users/u1/locations').reply(200, areas);
    mockAxios.onGet('/districts').reply(200, districts);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Taman Bungkul')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Cari lokasi'), { target: { value: 'bungkul' } });

    expect(screen.queryByText('Jl. Ahmad Yani')).not.toBeInTheDocument();
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });

  it('does not lazy-load a user’s areas when no user is set', () => {
    mockAxios.onGet('/districts').reply(200, districts);
    renderSheet(<UserAreasSheet user={null} onClose={jest.fn()} />);
    // useUserAreas is disabled → no per-user areas request (districts may still load).
    expect(mockAxios.history.get.some((r) => /\/users\/.+\/locations/.test(r.url ?? ''))).toBe(false);
  });
});
