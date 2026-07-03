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

  const areas = [
    { id: 'a1', name: 'Jl. Ahmad Yani', rayon: { name: 'Rayon Pusat' }, areaType: { name: 'Jalanan' } },
    { id: 'a2', name: 'Taman Bungkul', rayon: { name: 'Rayon Taman Aktif' }, areaType: { name: 'Taman' } },
  ];

  it('lazy-loads and lists the user areas with a count', async () => {
    mockAxios.onGet('/users/u1/areas').reply(200, areas);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Jl. Ahmad Yani')).toBeInTheDocument());
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByText('2 area')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
  });

  it('filters the list by the search box', async () => {
    mockAxios.onGet('/users/u1/areas').reply(200, areas);

    renderSheet(<UserAreasSheet user={{ id: 'u1', full_name: 'Budi' }} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Taman Bungkul')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Cari area'), { target: { value: 'bungkul' } });

    expect(screen.queryByText('Jl. Ahmad Yani')).not.toBeInTheDocument();
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });

  it('does not fetch when no user is set', () => {
    renderSheet(<UserAreasSheet user={null} onClose={jest.fn()} />);
    expect(mockAxios.history.get).toHaveLength(0);
  });
});
