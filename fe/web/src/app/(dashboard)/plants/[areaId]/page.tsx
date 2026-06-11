'use client';

/**
 * Area Plants Inventory Page
 * Display plant inventory for a specific area with status summary and notable plants
 */

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
} from '@/components/ui';
import { SectionCard } from '@/components/ui/section-card';
import { PlantStatusBadge } from '@/components/plants/PlantStatusBadge';
import { useArea } from '@/lib/api/areas';
import { useAreaPlants, useNotablePlants, summarizePlantStatuses } from '@/lib/api/plants';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

const CATEGORY_LABELS: Record<string, string> = {
  tree: 'Pohon',
  shrub: 'Semak',
  groundcover: 'Penutup Tanah',
  flower: 'Bunga',
};

export default function AreaPlantsPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = use(params);
  const router = useRouter();

  // Fetch area info
  const { data: area, isLoading: areaLoading } = useArea(areaId);

  // Fetch plants for this area
  const { data: plants, isLoading: plantsLoading } = useAreaPlants(areaId);

  // Fetch notable plants
  const { data: notablePlants, isLoading: notablePlantsLoading } = useNotablePlants(areaId);

  // Calculate summary
  const summary = useMemo(() => summarizePlantStatuses(plants), [plants]);

  const isLoading = areaLoading || plantsLoading || notablePlantsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <Skeleton variant="heading" className="w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        <SkeletonTable rows={8} />
        <SkeletonCard />
      </div>
    );
  }

  if (!area) {
    return (
      <EmptyState
        variant="error"
        title="Area tidak ditemukan"
        action={{
          label: 'Kembali',
          onClick: () => router.back(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          aria-label="Kembali"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-nb-h1 text-nb-black">{area.name}</h1>
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryTile label="Total Jenis" value={summary.total_species} />
        <SummaryTile label="Total Tanaman" value={summary.total_count} />
        <SummaryTile
          label="Jatuh Tempo"
          value={summary.due_soon + summary.overdue}
          tone="danger"
        />
      </div>

      {/* Plants Inventory Table */}
      {plants && plants.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spesies</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Dipangkas</TableHead>
                  <TableHead>Pangkas Berikutnya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plants.map((plant) => (
                  <TableRow key={plant.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">{plant.species?.nameId || '—'}</p>
                        <p className="text-xs text-nb-gray-600">
                          {CATEGORY_LABELS[plant.species?.category || ''] || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{plant.count}</TableCell>
                    <TableCell>
                      <PlantStatusBadge status={plant.status} />
                    </TableCell>
                    <TableCell className="text-nb-gray-600">
                      {plant.lastPrunedAt
                        ? formatRelativeTime(plant.lastPrunedAt)
                        : 'Belum dicatat'}
                    </TableCell>
                    <TableCell className="text-nb-gray-600">
                      {plant.nextDueAt
                        ? new Date(plant.nextDueAt).toLocaleDateString('id-ID', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState variant="noData" title="Belum ada data tanaman" />
      )}

      {/* Notable Plants Section */}
      {notablePlants && notablePlants.length > 0 && (
        <SectionCard title="Tanaman Istimewa" tone="mint">
          <div className="space-y-4">
            {notablePlants.map((plant) => (
              <div
                key={plant.id}
                className="flex gap-4 border-b-2 border-nb-gray-200 pb-4 last:border-b-0 last:pb-0"
              >
                {/* Optional: Photo gallery */}
                {plant.photoUrls && plant.photoUrls.length > 0 && (
                  <div className="shrink-0">
                    <img
                      src={plant.photoUrls[0]}
                      alt={plant.label || 'Tanaman istimewa'}
                      className="size-16 object-cover rounded-nb-base border-2 border-nb-black"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h4 className="text-nb-body-lg font-semibold">{plant.label}</h4>
                    {plant.heritage && (
                      <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 bg-nb-warning rounded-nb-sm border border-nb-black whitespace-nowrap">
                        Warisan
                      </span>
                    )}
                  </div>
                  <p className="text-nb-body-sm text-nb-gray-600 mt-1">
                    {plant.species?.nameId}
                  </p>
                  {plant.notes && (
                    <p className="text-nb-body-sm text-nb-gray-700 mt-2">{plant.notes}</p>
                  )}
                  <p className="text-[10px] text-nb-gray-500 mt-1 font-mono">
                    {plant.gpsLat.toFixed(4)}, {plant.gpsLng.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/**
 * SummaryTile — KPI card showing label + value
 */
function SummaryTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger';
}) {
  const bgClass = tone === 'danger' ? 'bg-nb-danger-light' : 'bg-nb-gray-50';
  const textClass = tone === 'danger' ? 'text-nb-danger' : 'text-nb-black';

  return (
    <Card className={cn(bgClass, 'border-2 border-nb-black rounded-nb-base shadow-nb-sm')}>
      <CardContent className="p-4">
        <p className="text-nb-body-sm text-nb-gray-600 mb-1">{label}</p>
        <p className={cn('text-nb-display text-left', textClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}
