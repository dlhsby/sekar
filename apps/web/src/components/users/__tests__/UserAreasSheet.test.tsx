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

  // The endpoint returns areas with rayon_id (areaType is eager); the rayon name
  // is resolved client-side from GET /rayons.
  const areas = [
    { id: 'a1', name: 'Jl. Ahmad Yani', rayon_id: 'r1', areaType: { name: 'Jalanan' } },
    { id: 'a2', name: 'Taman Bungkul', rayon_id: 'r2', areaType: { name: 'Taman' } },
  ];
  const rayons = [
    { id: 'r1', name: 'Rayon Pusat' },
    { id: 'r2', name: 'Rayon Taman Aktif' },
  ];

  it('lazy-loads and lists the user areas with a count + rayon label', async () => {
    mockAxios.onGet('/users/u1/areas').reply(200, areas);
    mockAxios.onGet('/rayons').reply(200, rayons);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Jl. Ahmad Yani')).toBeInTheDocument());
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByText('2 area')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    // rayon name resolved client-side from rayon_id
    expect(screen.getByText(/Rayon Taman Aktif · Taman/)).toBeInTheDocument();
  });

  it('filters the list by the search box', async () => {
    mockAxios.onGet('/users/u1/areas').reply(200, areas);
    mockAxios.onGet('/rayons').reply(200, rayons);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Taman Bungkul')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Cari area'), { target: { value: 'bungkul' } });

    expect(screen.queryByText('Jl. Ahmad Yani')).not.toBeInTheDocument();
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });

  it('does not lazy-load a user’s areas when no user is set', () => {
    mockAxios.onGet('/rayons').reply(200, rayons);
    renderSheet(<UserAreasSheet user={null} onClose={jest.fn()} />);
    // useUserAreas is disabled → no per-user areas request (rayons may still load).
    expect(mockAxios.history.get.some((r) => /\/users\/.+\/areas/.test(r.url ?? ''))).toBe(false);
  });
});
