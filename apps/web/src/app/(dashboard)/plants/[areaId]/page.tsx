'use client';

/**
 * Area Plants Inventory Page
 * Display plant inventory for a specific area with status summary and notable plants
 */

import { use, useMemo } from 'react';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
import { useLocation } from '@/lib/api/locations';
import { useAreaPlants, useNotablePlants, summarizePlantStatuses } from '@/lib/api/plants';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

export default function AreaPlantsPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = use(params);
  const router = useRouter();
  const { t } = useTranslation(['plants', 'common']);

  // Fetch area info
  const { data: area, isLoading: areaLoading } = useLocation(areaId);

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
        title={t('plants:areaDetail.notFound')}
        action={{
          label: t('common:actions.back'),
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
          aria-label={t('plants:areaDetail.backButtonLabel')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-nb-h1 text-nb-black">{area.name}</h1>
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryTile label={t('plants:areaDetailSummary.totalSpecies')} value={summary.total_species} />
        <SummaryTile label={t('plants:areaDetailSummary.totalPlants')} value={summary.total_count} />
        <SummaryTile
          label={t('plants:areaDetailSummary.dueSoon')}
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
                  <TableHead>{t('plants:areaDetailTable.columnSpecies')}</TableHead>
                  <TableHead className="text-right">{t('plants:areaDetailTable.columnQuantity')}</TableHead>
                  <TableHead>{t('plants:areaDetailTable.columnStatus')}</TableHead>
                  <TableHead>{t('plants:areaDetailTable.columnLastPruned')}</TableHead>
                  <TableHead>{t('plants:areaDetailTable.columnNextPruning')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plants.map((plant) => (
                  <TableRow key={plant.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">{plant.species?.nameId || '—'}</p>
                        <p className="text-xs text-nb-gray-600">
                          {t(`plants:categoryLabels.${plant.species?.category || 'unknown'}`) || '—'}
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
                        : t('plants:areaDetailTable.notRecorded')}
                    </TableCell>
                    <TableCell className="text-nb-gray-600">
                      {plant.nextDueAt
                        ? new Date(plant.nextDueAt).toLocaleDateString(intlLocale(), {
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
        <EmptyState variant="noData" title={t('plants:areaDetailTable.emptyTitle')} />
      )}

      {/* Notable Plants Section */}
      {notablePlants && notablePlants.length > 0 && (
        <SectionCard title={t('plants:notablePlants.sectionTitle')} tone="mint">
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
                      alt={plant.label || t('plants:notablePlants.sectionTitle')}
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
                        {t('plants:notablePlants.heritageLabel')}
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
