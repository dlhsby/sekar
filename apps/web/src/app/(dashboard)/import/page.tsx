/**
 * Import Data hub + KMZ import — IMP-1 (Phase 4-5).
 *
 * Landing page for data import. Hosts the KMZ/KML area import (upload → preview
 * → confirm) and links to the CSV import wizard. New areas parsed from the KMZ
 * need an Area Type + Rayon (chosen once and applied to all creates); matched
 * areas are updated in place.
 *
 * Access: admin_system, superadmin.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';

import { Button, FormSelect, SectionCard, DataTable, StatusPill, Alert } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import { getErrorMessage } from '@/lib/api/client';
import { useAreaTypes } from '@/lib/api/area-types';
import { useRayons } from '@/lib/api/rayons';
import {
  useUploadKmz,
  useConfirmKmz,
  type KmzUploadResponse,
  type ParsedArea,
  type KmzConfirmSelection,
} from '@/lib/api/import';

export default function ImportPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!hasRole(user.role, ADMIN_ROLES)) return null;

  return <KmzImport />;
}

const SENTINEL = '';

function KmzImport() {
  const { t } = useTranslation(['import']);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<KmzUploadResponse | null>(null);
  const [areaTypeId, setAreaTypeId] = useState(SENTINEL);
  const [rayonId, setRayonId] = useState(SENTINEL);

  const uploadKmz = useUploadKmz();
  const confirmKmz = useConfirmKmz();
  const { data: areaTypes } = useAreaTypes();
  const { data: rayons } = useRayons();

  const hasNewAreas = useMemo(() => (preview?.new_areas ?? 0) > 0, [preview]);
  const needsDefaults = hasNewAreas && (!areaTypeId || !rayonId);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await uploadKmz.mutateAsync(file);
      setPreview(response);
      if (response.total_areas === 0) {
        toast.warning(t('kmz.noAreasWarning'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const selections: KmzConfirmSelection[] = preview.areas.map((area, index) => ({
      index,
      action: area.match_status === 'update' ? 'update' : 'create',
      area_type_id: area.match_status === 'update' ? undefined : areaTypeId,
      rayon_id: area.match_status === 'update' ? undefined : rayonId,
    }));
    try {
      const result = await confirmKmz.mutateAsync({ sessionId: preview.session_id, areas: selections });
      toast.success(t('kmz.successMessage', { created: result.created, updated: result.updated }));
      setPreview(null); // clear the consumed session before navigating away
      router.push('/locations');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const areaTypeOptions = (areaTypes ?? []).map((t) => ({ value: t.id, label: t.name }));
  const rayonOptions = (rayons ?? []).map((r) => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('kmz.title')}
        meta={
          <a href="/import/csv" className="inline-flex items-center gap-1 text-nb-primary underline">
            <FileSpreadsheet className="h-4 w-4" /> {t('kmz.csvLink')}
          </a>
        }
      >
        <p className="mb-4 text-nb-body-sm text-nb-gray-600">
          {t('kmz.description')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".kmz,.kml"
          onChange={handleFile}
          className="hidden"
          aria-label={t('kmz.selectFileAriaLabel')}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          loading={uploadKmz.isPending}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          {t('kmz.selectFileButton')}
        </Button>
      </SectionCard>

      {preview && (
        <SectionCard
          title={t('kmz.preview')}
          meta={`${preview.new_areas} ${t('kmz.new')} · ${preview.update_areas} ${t('kmz.updated')}`}
        >
          {hasNewAreas && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <FormSelect
                label={t('kmz.areaTypeLabel')}
                options={areaTypeOptions}
                value={areaTypeId}
                onChange={setAreaTypeId}
                placeholder={t('kmz.areaTypePlaceholder')}
              />
              <FormSelect
                label={t('kmz.rayonLabel')}
                options={rayonOptions}
                value={rayonId}
                onChange={setRayonId}
                placeholder={t('kmz.rayonPlaceholder')}
              />
            </div>
          )}

          {needsDefaults && (
            <Alert tone="warning" className="mb-4">
              {t('kmz.requirementsAlert')}
            </Alert>
          )}

          <PreviewTable areas={preview.areas} t={t} />

          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>
              {t('kmz.cancel')}
            </Button>
            <Button onClick={handleConfirm} loading={confirmKmz.isPending} disabled={needsDefaults}>
              {t('kmz.confirm')}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function PreviewTable({ areas, t }: { areas: ParsedArea[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const columns: ColumnDef<ParsedArea & Record<string, unknown>>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('kmz.columns.name'),
      enableSorting: true,
      meta: { label: t('kmz.columns.name') },
    },
    {
      id: 'polygon',
      header: t('kmz.columns.points'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('kmz.columns.points') },
      cell: ({ row }) => (Array.isArray(row.original.polygon) ? `${row.original.polygon.length} ${t('kmz.columns.points')}` : '—'),
    },
    {
      id: 'match_status',
      accessorKey: 'match_status',
      header: t('kmz.columns.status'),
      enableSorting: true,
      meta: { label: t('kmz.columns.status') },
      cell: ({ row }) =>
        row.original.match_status === 'update' ? (
          <StatusPill tone="warn">{t('kmz.statusLabels.update')}</StatusPill>
        ) : (
          <StatusPill tone="ok">{t('kmz.statusLabels.new')}</StatusPill>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={areas.map((a, i) => ({ ...a, _k: i }))}
      getRowId={(r) => String(r._k)}
      emptyTitle={t('kmz.columns.status')}
    />
  );
}
