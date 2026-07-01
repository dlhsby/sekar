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
import { redirect } from 'next/navigation';
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
const EXPORT_ROLES: UserRole[] = ['admin_system', 'superadmin', 'kepala_rayon'];

const ENTITY_LABELS: Record<ExportEntityType, string> = {
  users: 'Pengguna',
  areas: 'Area',
  rayons: 'Rayon',
  tasks: 'Tugas',
  activities: 'Aktivitas',
  overtime: 'Lembur',
};

/** Entities a kepala_rayon may export (their own rayon only). */
const KEPALA_RAYON_ENTITIES: ExportEntityType[] = ['tasks', 'activities', 'overtime'];

const STATUS_TONE: Record<ExportJob['status'], 'ok' | 'warn' | 'bad'> = {
  completed: 'ok',
  processing: 'warn',
  failed: 'bad',
};

const STATUS_LABEL: Record<ExportJob['status'], string> = {
  completed: 'Selesai',
  processing: 'Diproses',
  failed: 'Gagal',
};

const ALL = 'all';

export default function ExportPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, EXPORT_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">Memuat…</p>
      </div>
    );
  }

  if (!hasRole(user.role, EXPORT_ROLES)) return null;

  return <ExportForm role={user.role} />;
}

function ExportForm({ role }: { role: UserRole }) {
  const isKepalaRayon = role === 'kepala_rayon';
  const entityOptions = useMemo(
    () =>
      (isKepalaRayon ? KEPALA_RAYON_ENTITIES : (Object.keys(ENTITY_LABELS) as ExportEntityType[])).map(
        (value) => ({ value, label: ENTITY_LABELS[value] }),
      ),
    [isKepalaRayon],
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
      toast.success('Ekspor selesai. Unduhan siap.');
      jobsQuery.refetch();
      setActiveJobId(null);
    } else if (jobStatus === 'failed') {
      toast.error(`Ekspor gagal: ${jobError ?? 'kesalahan tidak diketahui'}`);
      setActiveJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus, jobError]);

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
        toast.success(`Berhasil mengunduh ${outcome.filename}`);
        jobsQuery.refetch();
      } else {
        setActiveJobId(outcome.job.jobId);
        toast.info('Data besar — ekspor diproses di latar belakang…');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rayonOptions = [
    { value: ALL, label: 'Semua Rayon' },
    ...(rayons ?? []).map((r) => ({ value: r.id, label: r.name })),
  ];
  const areaOptions = [
    { value: ALL, label: 'Semua Area' },
    ...(areasPage?.data ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const polling = !!activeJobId && activeJob.data?.status === 'processing';

  return (
    <div className="space-y-5">
      <SectionCard title="Ekspor Data">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Jenis Data"
            options={entityOptions}
            value={entityType}
            onChange={(v) => setEntityType(v as ExportEntityType)}
          />
          <FormSelect
            label="Format"
            options={formatOptions}
            value={format}
            onChange={(v) => setFormat(v as ExportFormat)}
          />
          <Field label="Rentang Tanggal">
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
          <FormSelect label="Rayon" options={rayonOptions} value={rayonId} onChange={setRayonId} />
          <FormSelect label="Area" options={areaOptions} value={areaId} onChange={setAreaId} />
        </div>

        <div className="mt-5">
          <Button
            onClick={handleExport}
            loading={exportData.isPending || polling}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {polling ? 'Memproses…' : 'Unduh Ekspor'}
          </Button>
        </div>
      </SectionCard>

      <ExportHistory jobs={jobsQuery.data ?? []} loading={jobsQuery.isLoading} />
    </div>
  );
}

function ExportHistory({ jobs, loading }: { jobs: ExportJob[]; loading: boolean }) {
  const columns: ColumnDef<ExportJob & Record<string, unknown>>[] = [
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Tanggal',
      enableSorting: true,
      meta: { label: 'Tanggal' },
      cell: ({ row }) => new Date(row.original.createdAt as string).toLocaleString('id-ID'),
    },
    {
      id: 'entityType',
      accessorKey: 'entityType',
      header: 'Jenis',
      enableSorting: true,
      meta: { label: 'Jenis' },
      cell: ({ row }) => ENTITY_LABELS[row.original.entityType as ExportEntityType],
    },
    {
      id: 'format',
      accessorKey: 'format',
      header: 'Format',
      enableSorting: true,
      meta: { label: 'Format' },
      cell: ({ row }) => String(row.original.format).toUpperCase(),
    },
    {
      id: 'rowCount',
      accessorKey: 'rowCount',
      header: 'Baris',
      enableSorting: true,
      meta: { label: 'Baris' },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      meta: { label: 'Status' },
      cell: ({ row }) => {
        const status = row.original.status as ExportJob['status'];
        return <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>;
      },
    },
    {
      id: 'downloadUrl',
      header: 'Unduh',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Unduh', pinRight: true },
      cell: ({ row }) =>
        row.original.status === 'completed' && row.original.downloadUrl ? (
          <a
            href={row.original.downloadUrl as string}
            className="text-nb-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Unduh
          </a>
        ) : (
          <span className="text-nb-gray-400">—</span>
        ),
    },
  ];

  return (
    <SectionCard title="Riwayat Ekspor" meta="30 hari terakhir">
      <DataTable
        columns={columns}
        data={jobs as (ExportJob & Record<string, unknown>)[]}
        loading={loading}
        getRowId={(r) => r.jobId}
        emptyTitle="Belum ada ekspor."
      />
    </SectionCard>
  );
}
