/**
 * Export Data page — EXP-1 (Phase 4-5).
 *
 * Admins pick an entity + format + optional filters and download a CSV/XLSX
 * (KMZ for areas). Exports ≤5000 rows download inline; larger ones create an
 * async job that this page polls every 3s, then offers a download link. The
 * Export History table lists the user's jobs from the last 30 days.
 *
 * Access: admin_system, superadmin, and kepala_rayon (limited to their rayon's
 * tasks/activities/overtime — enforced server-side).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { intlLocale } from '@/lib/i18n/date-locale';
import { redirect } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

import { Button, FormSelect, SectionCard, DataTable, StatusPill, Field, DateRangePicker } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import { getErrorMessage } from '@/lib/api/client';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import {
  useExportData,
  useExportJobs,
  useExportJob,
  type ExportEntityType,
  type ExportFormat,
  type ExportJob,
} from '@/lib/api/export';

/** Roles allowed to reach this page (server enforces the finer scoping). */
const EXPORT_ROLES: UserRole[] = ['admin_system', 'superadmin', 'management', 'kepala_rayon'];

function getEntityLabels(t: ReturnType<typeof useTranslation>['t']): Record<ExportEntityType, string> {
  return {
    users: t('export.entities.users'),
    areas: t('export.entities.areas'),
    rayons: t('export.entities.rayons'),
    tasks: t('export.entities.tasks'),
    activities: t('export.entities.activities'),
    overtime: t('export.entities.overtime'),
  };
}

/** Entities a kepala_rayon may export (their own rayon only). */
const KEPALA_RAYON_ENTITIES: ExportEntityType[] = ['tasks', 'activities', 'overtime'];

const STATUS_TONE: Record<ExportJob['status'], 'ok' | 'warn' | 'bad'> = {
  completed: 'ok',
  processing: 'warn',
  failed: 'bad',
};

function getStatusLabels(t: ReturnType<typeof useTranslation>['t']): Record<ExportJob['status'], string> {
  return {
    completed: t('export.status.completed'),
    processing: t('export.status.processing'),
    failed: t('export.status.failed'),
  };
}

const ALL = 'all';

export default function ExportPage() {
  const { t } = useTranslation(['import']);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, EXPORT_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('export.loading')}</p>
      </div>
    );
  }

  if (!hasRole(user.role, EXPORT_ROLES)) return null;

  return <ExportForm role={user.role} />;
}

function ExportForm({ role }: { role: UserRole }) {
  const { t } = useTranslation(['import']);
  const isKepalaRayon = role === 'kepala_rayon';
  const entityLabels = useMemo(() => getEntityLabels(t), [t]);
  const statusLabels = useMemo(() => getStatusLabels(t), [t]);

  const entityOptions = useMemo(
    () =>
      (isKepalaRayon ? KEPALA_RAYON_ENTITIES : (Object.keys(entityLabels) as ExportEntityType[])).map(
        (value) => ({ value, label: entityLabels[value] }),
      ),
    [isKepalaRayon, entityLabels],
  );

  const [entityType, setEntityType] = useState<ExportEntityType>(entityOptions[0].value as ExportEntityType);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rayonId, setRayonId] = useState(ALL);
  const [areaId, setAreaId] = useState(ALL);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const exportData = useExportData();
  const jobsQuery = useExportJobs();
  const activeJob = useExportJob(activeJobId);

  const { data: rayons } = useRayons();
  const { data: areasPage } = useAreas(rayonId !== ALL ? { rayon_id: rayonId } : {});

  const formatOptions = useMemo(() => {
    const base = [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel (XLSX)' },
    ];
    return entityType === 'areas' ? [...base, { value: 'kmz', label: 'KMZ' }] : base;
  }, [entityType]);

  // Reset KMZ format if the entity changes away from areas.
  useEffect(() => {
    if (format === 'kmz' && entityType !== 'areas') {
      setFormat('csv');
    }
  }, [entityType, format]);

  // Surface async-job completion / failure as the poll resolves. Depend on the
  // status/error primitives so this fires once per transition (not on every
  // 3s poll). `jobsQuery.refetch` is a stable TanStack Query fn — omitted on
  // purpose to avoid re-running on unrelated renders.
  const jobStatus = activeJob.data?.status;
  const jobError = activeJob.data?.errorMessage;
  useEffect(() => {
    if (!jobStatus) return;
    if (jobStatus === 'completed') {
      toast.success(t('export.successMessage'));
      jobsQuery.refetch();
      setActiveJobId(null);
    } else if (jobStatus === 'failed') {
      toast.error(`${t('export.errorMessage')}: ${jobError ?? t('common:errors2.unknown')}`);
      setActiveJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus, jobError, t]);

  const handleExport = async () => {
    try {
      const outcome = await exportData.mutateAsync({
        entityType,
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        rayonId: rayonId !== ALL ? rayonId : undefined,
        areaId: areaId !== ALL ? areaId : undefined,
      });
      if (outcome.kind === 'downloaded') {
        toast.success(`${t('common:actions.download')} ${outcome.filename}`);
        jobsQuery.refetch();
      } else {
        setActiveJobId(outcome.job.jobId);
        toast.info(t('export.largeDataMessage'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rayonOptions = useMemo(
    () => [
      { value: ALL, label: t('export.allRayons') },
      ...(rayons ?? []).map((r) => ({ value: r.id, label: r.name })),
    ],
    [rayons, t]
  );
  const areaOptions = useMemo(
    () => [
      { value: ALL, label: t('export.allAreas') },
      ...(areasPage?.data ?? []).map((a) => ({ value: a.id, label: a.name })),
    ],
    [areasPage, t]
  );

  const polling = !!activeJobId && activeJob.data?.status === 'processing';

  return (
    <div className="space-y-5">
      <SectionCard title={t('export.title')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label={t('export.entityLabel')}
            options={entityOptions}
            value={entityType}
            onChange={(v) => setEntityType(v as ExportEntityType)}
          />
          <FormSelect
            label={t('export.formatLabel')}
            options={formatOptions}
            value={format}
            onChange={(v) => setFormat(v as ExportFormat)}
          />
          <Field label={t('export.dateRangeLabel')}>
            {() => (
              <DateRangePicker
                showSteppers={false}
                value={{
                  from: startDate || new Date().toISOString().slice(0, 10),
                  to: endDate || new Date().toISOString().slice(0, 10),
                }}
                onChange={(r) => {
                  setStartDate(r.from);
                  setEndDate(r.to);
                }}
              />
            )}
          </Field>
          <FormSelect label={t('export.rayonLabel')} options={rayonOptions} value={rayonId} onChange={setRayonId} />
          <FormSelect label={t('export.areaLabel')} options={areaOptions} value={areaId} onChange={setAreaId} />
        </div>

        <div className="mt-5">
          <Button
            onClick={handleExport}
            loading={exportData.isPending || polling}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {polling ? t('export.processingButton') : t('export.exportButton')}
          </Button>
        </div>
      </SectionCard>

      <ExportHistory jobs={jobsQuery.data ?? []} loading={jobsQuery.isLoading} />
    </div>
  );
}

function ExportHistory({ jobs, loading }: { jobs: ExportJob[]; loading: boolean }) {
  const { t } = useTranslation(['import']);
  const entityLabels = useMemo(() => getEntityLabels(t), [t]);
  const statusLabels = useMemo(() => getStatusLabels(t), [t]);

  const columns: ColumnDef<ExportJob & Record<string, unknown>>[] = useMemo(
    () => [
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: t('export.columns.date'),
        enableSorting: true,
        meta: { label: t('export.columns.date') },
        cell: ({ row }) => new Date(row.original.createdAt as string).toLocaleString(intlLocale()),
      },
      {
        id: 'entityType',
        accessorKey: 'entityType',
        header: t('export.columns.entityType'),
        enableSorting: true,
        meta: { label: t('export.columns.entityType') },
        cell: ({ row }) => entityLabels[row.original.entityType as ExportEntityType],
      },
      {
        id: 'format',
        accessorKey: 'format',
        header: t('export.columns.format'),
        enableSorting: true,
        meta: { label: t('export.columns.format') },
        cell: ({ row }) => String(row.original.format).toUpperCase(),
      },
      {
        id: 'rowCount',
        accessorKey: 'rowCount',
        header: t('export.columns.rowCount'),
        enableSorting: true,
        meta: { label: t('export.columns.rowCount') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('export.columns.status'),
        enableSorting: true,
        meta: { label: t('export.columns.status') },
        cell: ({ row }) => {
          const status = row.original.status as ExportJob['status'];
          return <StatusPill tone={STATUS_TONE[status]}>{statusLabels[status]}</StatusPill>;
        },
      },
      {
        id: 'downloadUrl',
        header: t('export.columns.download'),
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: t('export.columns.download'), pinRight: true },
        cell: ({ row }) =>
          row.original.status === 'completed' && row.original.downloadUrl ? (
            <a
              href={row.original.downloadUrl as string}
              className="text-nb-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              {t('export.downloadLink')}
            </a>
          ) : (
            <span className="text-nb-gray-400">—</span>
          ),
      },
    ],
    [t, entityLabels, statusLabels]
  );

  return (
    <SectionCard title={t('export.history')} meta={t('export.historyMeta')}>
      <DataTable
        columns={columns}
        data={jobs as (ExportJob & Record<string, unknown>)[]}
        loading={loading}
        getRowId={(r) => r.jobId}
        emptyTitle={t('export.noExports')}
      />
    </SectionCard>
  );
}
