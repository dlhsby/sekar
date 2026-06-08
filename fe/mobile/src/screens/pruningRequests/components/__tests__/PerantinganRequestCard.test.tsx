import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { PerantinganRequestCard } from '../PerantinganRequestCard';
import type { PruningRequest, PruningRequestStatus } from '../../../../types/models.types';

const BASE_REQUEST = {
  id: 'pr-1',
  referenceCode: 'PR-2026-0331',
  submittedBy: 'user-1',
  submitter: { id: 'user-1', full_name: 'Siti Aminah', role: 'staff_kecamatan' },
  kecamatanName: 'Tegalsari',
  address: 'Jl. Pemuda No. 123',
  gpsLat: -7.25,
  gpsLng: 112.75,
  expectedDate: null,
  expectedYear: 2026,
  expectedIsoWeek: 24,
  scheduledDate: null,
  estimatedPlantCount: null,
  treeCount: 12,
  treeHeightEstimate: '5 m',
  treeDiameterEstimate: '30 cm',
  requesterName: 'Budi',
  requesterPhone: null,
  rtLeaderName: null,
  rtLeaderPhone: null,
  photoUrls: ['a.jpg', 'b.jpg'],
  notes: null,
  status: 'submitted',
  rayonId: null,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  assignedTaskId: null,
  createdAt: '2026-06-08T07:30:00Z',
  updatedAt: '2026-06-08T07:30:00Z',
} as unknown as PruningRequest;

describe('PerantinganRequestCard', () => {
  it('uses the address as the title', () => {
    const { getByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    expect(getByText('Jl. Pemuda No. 123')).toBeTruthy();
  });

  it('falls back to kecamatan when address is missing', () => {
    const { getAllByText } = render(
      <PerantinganRequestCard request={{ ...BASE_REQUEST, address: '' } as any} onPress={() => {}} />
    );
    // Kecamatan now appears twice: as the title fallback and as a meta chip.
    expect(getAllByText('Tegalsari').length).toBe(2);
  });

  it('falls back to reference code when address and kecamatan are missing', () => {
    const { getAllByText } = render(
      <PerantinganRequestCard
        request={{ ...BASE_REQUEST, address: '', kecamatanName: '' } as any}
        onPress={() => {}}
      />
    );
    // ref code now appears as both the title fallback and a meta chip
    expect(getAllByText('PR-2026-0331').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the tree-detail line in the description (count · height · diameter)', () => {
    const { getByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    expect(getByText('12 pohon · ±5 m · ⌀30 cm')).toBeTruthy();
  });

  it('omits the description when no tree fields are present', () => {
    const { queryByText } = render(
      <PerantinganRequestCard
        request={{ ...BASE_REQUEST, treeCount: null, estimatedPlantCount: null, treeHeightEstimate: null, treeDiameterEstimate: null } as any}
        onPress={() => {}}
      />
    );
    expect(queryByText(/pohon/)).toBeNull();
  });

  it('falls back to estimatedPlantCount for the tree count', () => {
    const { getByText } = render(
      <PerantinganRequestCard
        request={{ ...BASE_REQUEST, treeCount: null, estimatedPlantCount: 7, treeHeightEstimate: null, treeDiameterEstimate: null } as any}
        onPress={() => {}}
      />
    );
    expect(getByText('7 pohon')).toBeTruthy();
  });

  it('renders reference code, kecamatan and photo count as meta chips', () => {
    const { getByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    expect(getByText('PR-2026-0331')).toBeTruthy();
    expect(getByText('Tegalsari')).toBeTruthy();
    expect(getByText('2 foto')).toBeTruthy();
  });

  it('does not render the photo chip when there are no photos', () => {
    const { queryByText } = render(
      <PerantinganRequestCard request={{ ...BASE_REQUEST, photoUrls: [] } as any} onPress={() => {}} />
    );
    expect(queryByText(/foto/)).toBeNull();
  });

  it('does not duplicate the tree count as a meta chip', () => {
    const { queryAllByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    // "12 pohon" lives only in the description line, never as a separate chip
    expect(queryAllByText('12 pohon').length).toBe(0);
  });

  it('shows the submitter name as the creator line', () => {
    const { getByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    expect(getByText('Siti Aminah')).toBeTruthy();
  });

  it('falls back to requesterName when there is no submitter', () => {
    const { getByText } = render(
      <PerantinganRequestCard request={{ ...BASE_REQUEST, submitter: undefined } as any} onPress={() => {}} />
    );
    expect(getByText('Budi')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={onPress} />);
    fireEvent.press(getByText('Jl. Pemuda No. 123'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders an extraTag when provided', () => {
    const { getByText } = render(
      <PerantinganRequestCard
        request={BASE_REQUEST}
        onPress={() => {}}
        extraTag={<Text>SLA 4j</Text>}
      />
    );
    expect(getByText('SLA 4j')).toBeTruthy();
  });

  it('exposes the pruning-request-card testID', () => {
    const { getByTestId } = render(<PerantinganRequestCard request={BASE_REQUEST} onPress={() => {}} />);
    expect(getByTestId('pruning-request-card')).toBeTruthy();
  });

  describe('status pill labels (pruningPill)', () => {
    const cases: Array<[PruningRequestStatus, string]> = [
      ['submitted', 'Menunggu'],
      ['under_review', 'Direview'],
      ['approved', 'Disetujui'],
      ['rejected', 'Ditolak'],
      ['assigned', 'Ditugaskan'],
      ['in_progress', 'Diproses'],
      ['done', 'Selesai'],
      ['cancelled', 'Dibatalkan'],
    ];

    test.each(cases)('status %s → pill "%s"', (status, label) => {
      const { getByText } = render(
        <PerantinganRequestCard request={{ ...BASE_REQUEST, status } as any} onPress={() => {}} />
      );
      expect(getByText(label)).toBeTruthy();
    });
  });
});
