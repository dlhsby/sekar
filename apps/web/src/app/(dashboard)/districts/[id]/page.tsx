/**
 * Rayon Detail Page — RAY-1 (Phase 4-R revamp)
 * Access: admin_system, superadmin, management, kepala_rayon
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useDistrict, useDistrictStats, useDistrictAreas } from '@/lib/api/districts';
import DistrictStatsCards from '@/components/districts/DistrictStatsCards';
import {
  Card,
  CardContent,
  Button,
  FormInput,
  DataTable,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { Location } from '@/types/models';
import { formatArea } from '@/lib/utils/geo';
import type { ColumnDef } from '@/components/ui/data-table';

// Lowercase roles per ADR-009 (the prior PascalCase gate matched nothing and
// redirected every user to a non-existent /dashboard).
const ALLOWED_ROLES = ['admin_system', 'superadmin', 'management', 'kepala_rayon'];

interface DistrictDetailPageProps {
  // Next 16: route params are a Promise and must be unwrapped with `use()`.
  params: Promise<{ id: string }>;
}

export default function DistrictDetailPage({ params }: DistrictDetailPageProps) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: district, isLoading: districtLoading } = useDistrict(id);
  const { data: stats, isLoading: statsLoading } = useDistrictStats(id);
  const { data: areasData, isLoading: areasLoading } = useDistrictAreas(id, {
    search,
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!allowed) return null;

  const areas = areasData?.data || [];
  const pagination = areasData?.meta;

  const columns: ColumnDef<Location>[] = [
    {
      id: 'name',
      header: t('admin:locations.columnName'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('admin:locations.columnName') },
      cell: ({ row }) => (
        <Link href={`/locations/${row.original.id}`} className="font-semibold text-nb-primary hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'area_type',
      header: t('admin:locations.columnType'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('admin:locations.columnType') },
      cell: ({ row }) => <span className="text-nb-body-sm">{row.original.locationType?.name || '—'}</span>,
    },
    {
      id: 'coverage_area',
      header: t('admin:districts.stats.totalCoverageArea'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('admin:districts.stats.totalCoverageArea') },
      cell: ({ row }) => (
        <span className="font-mono text-nb-body-sm">
          {row.original.coverage_area ? formatArea(row.original.coverage_area) : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('admin:locations.columnStatus'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('admin:locations.columnStatus') },
      cell: () => (
        <StatusPill tone="ok" dot>
          {t('admin:locations.statusActive')}
        </StatusPill>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={districtLoading ? t('admin:districts.loadingTitle') : `Rayon ${district?.name ?? ''}`}
        description={district?.description || undefined}
        actions={
          stats ? (
            <StatusPill tone="neutral">
              {t('admin:districts.staffCount', { count: stats.total_users })}
            </StatusPill>
          ) : undefined
        }
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link href={`/districts/${id}/capacity`}>
          <Button variant="secondary">{t('admin:districts.actionCapacity')}</Button>
        </Link>
      </div>

      {/* KPI strip */}
      <DistrictStatsCards stats={stats} loading={statsLoading} />

      {/* Areas list */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <FormInput
              label={t('admin:locations.form.name')}
              type="text"
              placeholder={t('admin:locations.form.namePlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>

          <DataTable
            columns={columns}
            data={areas}
            loading={areasLoading}
            enablePagination={false}
            getRowId={(a) => a.id}
            emptyTitle={t('admin:shared.noAreas')}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                {t('admin:shared.pageOf', { page: pagination.page, total: pagination.totalPages, count: pagination.total })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  ‹
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
