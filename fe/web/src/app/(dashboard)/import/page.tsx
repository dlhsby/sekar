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
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
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

  if (!hasRole(user.role, ADMIN_ROLES)) return null;

  return <KmzImport />;
}

const SENTINEL = '';

function KmzImport() {
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
        toast.warning('Tidak ada area ditemukan dalam berkas.');
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
      toast.success(`Impor selesai: ${result.created} dibuat, ${result.updated} diperbarui.`);
      setPreview(null); // clear the consumed session before navigating away
      router.push('/areas');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const areaTypeOptions = (areaTypes ?? []).map((t) => ({ value: t.id, label: t.name }));
  const rayonOptions = (rayons ?? []).map((r) => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-5">
      <SectionCard
        title="Impor KMZ / KML"
        meta={
          <a href="/import/csv" className="inline-flex items-center gap-1 text-nb-primary underline">
            <FileSpreadsheet className="h-4 w-4" /> Impor CSV
          </a>
        }
      >
        <p className="mb-4 text-nb-body-sm text-nb-gray-600">
          Unggah berkas KMZ atau KML untuk membuat atau memperbarui area dari batas polygon.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".kmz,.kml"
          onChange={handleFile}
          className="hidden"
          aria-label="Pilih berkas KMZ"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          loading={uploadKmz.isPending}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          Pilih Berkas KMZ
        </Button>
      </SectionCard>

      {preview && (
        <SectionCard
          title="Pratinjau"
          meta={`${preview.new_areas} baru · ${preview.update_areas} pembaruan`}
        >
          {hasNewAreas && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <FormSelect
                label="Tipe Area (untuk area baru)"
                options={areaTypeOptions}
                value={areaTypeId}
                onChange={setAreaTypeId}
                placeholder="Pilih tipe area"
              />
              <FormSelect
                label="Rayon (untuk area baru)"
                options={rayonOptions}
                value={rayonId}
                onChange={setRayonId}
                placeholder="Pilih rayon"
              />
            </div>
          )}

          {needsDefaults && (
            <Alert tone="warning" className="mb-4">
              Pilih Tipe Area dan Rayon untuk area baru sebelum mengimpor.
            </Alert>
          )}

          <PreviewTable areas={preview.areas} />

          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Batal
            </Button>
            <Button onClick={handleConfirm} loading={confirmKmz.isPending} disabled={needsDefaults}>
              Konfirmasi Impor
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function PreviewTable({ areas }: { areas: ParsedArea[] }) {
  const columns: ColumnDef<ParsedArea & Record<string, unknown>>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Nama Area',
      enableSorting: true,
      meta: { label: 'Nama Area' },
    },
    {
      id: 'polygon',
      header: 'Titik',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Titik' },
      cell: ({ row }) => (Array.isArray(row.original.polygon) ? `${row.original.polygon.length} titik` : '—'),
    },
    {
      id: 'match_status',
      accessorKey: 'match_status',
      header: 'Status',
      enableSorting: true,
      meta: { label: 'Status' },
      cell: ({ row }) =>
        row.original.match_status === 'update' ? (
          <StatusPill tone="warn">Pembaruan</StatusPill>
        ) : (
          <StatusPill tone="ok">Baru</StatusPill>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={areas.map((a, i) => ({ ...a, _k: i }))}
      getRowId={(r) => String(r._k)}
      emptyTitle="Tidak ada area."
    />
  );
}
