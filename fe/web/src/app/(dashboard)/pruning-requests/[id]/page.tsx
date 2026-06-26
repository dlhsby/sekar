/**
 * Pruning Request detail page — PRT-1 (Phase 4-R revamp).
 *
 * Shows the full kecamatan submission and exposes the two terminal admin
 * actions: review (approve/reject) and assign-to-task. Mirrors the mobile
 * RequestDetailScreen + AssignToTaskSheet as a v2.1 SectionCard stack:
 * meta · location/contacts · photos (lightbox) · review history · actions.
 * The review + convert hooks are unchanged.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DatePicker,
  Field as FormField,
  FormSelect,
  SectionCard,
  SkeletonCard,
  StatusPill,
  Textarea,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import {
  PRUNING_REQUEST_ADMIN_ROLES,
  PRUNING_REQUEST_STATUS_LABELS,
  PRUNING_REQUEST_STATUS_TONES,
} from '@/lib/constants/pruning-requests';
import {
  usePruningRequest,
  useReviewPruningRequest,
  useConvertPruningRequestToTask,
  type ConvertToTaskDto,
} from '@/lib/api/pruning-requests';
import { useAreas } from '@/lib/api/areas';
import { useUsers } from '@/lib/api/users';

type CaseType = ConvertToTaskDto['caseType'];
type PruningAction = ConvertToTaskDto['pruningAction'];

const CASE_TYPES: Array<{ label: string; value: CaseType }> = [
  { label: 'Gawat Darurat', value: 'GT' },
  { label: 'Pemeliharaan Teratur', value: 'PT' },
  { label: 'Pemeliharaan Khusus', value: 'PS' },
  { label: 'Pembersihan Dahan', value: 'PD' },
  { label: 'Pemangkasan Khusus', value: 'PK' },
];

const PRUNING_ACTIONS: Array<{ label: string; value: PruningAction }> = [
  { label: 'Pemangkasan Moderat', value: 'PM' },
  { label: 'Pemangkasan Berat', value: 'PB' },
  { label: 'Pemangkasan Cabang', value: 'PC' },
];

const ASSIGNEE_ROLES: UserRole[] = ['korlap', 'satgas', 'linmas', 'kepala_rayon', 'admin_data'];

export default function PruningRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, [...PRUNING_REQUEST_ADMIN_ROLES] as UserRole[])) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: request, isLoading, isError } = usePruningRequest(id);
  // Areas + users — fetched once, filtered client-side by request.rayonId so
  // the dropdowns only show in-scope options.
  const { data: areasResponse } = useAreas({ rayon_id: request?.rayonId ?? undefined });
  // useUsers' filter doesn't accept rayon_id; fetch a generous page and filter client-side.
  const { data: usersResponse } = useUsers({ limit: 200 });

  // Hoist the optional-chain read to a stable value so the memo deps are plain
  // identifiers (the React Compiler can't preserve a member-expression dep).
  const requestRayonId = request?.rayonId;
  const areaOptions = useMemo(
    () => (areasResponse?.data ?? []).map((a) => ({ label: a.name, value: a.id })),
    [areasResponse],
  );
  const assigneeOptions = useMemo(() => {
    const all = usersResponse?.data ?? [];
    return all
      .filter((u) => ASSIGNEE_ROLES.includes(u.role as UserRole))
      .filter((u) => !requestRayonId || u.rayon_id === requestRayonId)
      .map((u) => ({ label: `${u.full_name} (${u.role})`, value: u.id }));
  }, [usersResponse, requestRayonId]);

  // Review state
  const [reviewNotes, setReviewNotes] = useState('');
  const reviewMutation = useReviewPruningRequest(id);

  // Convert-to-task state
  const [areaId, setAreaId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('PT');
  const [pruningAction, setPruningAction] = useState<PruningAction>('PM');
  const [scheduledDate, setScheduledDate] = useState('');
  const convertMutation = useConvertPruningRequestToTask(id);

  // Photo lightbox
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="space-y-5">
        <div className="rounded-nb-base border-2 border-nb-danger bg-nb-white p-4 text-nb-danger">
          Gagal memuat permohonan. Coba kembali ke daftar.
        </div>
        <Link
          href="/pruning-requests"
          className="inline-flex items-center gap-1 font-semibold text-nb-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>
      </div>
    );
  }

  const canReview = request.status === 'submitted' || request.status === 'under_review';
  const canConvert = request.status === 'approved';

  const handleReview = (decision: 'approve' | 'reject') => {
    reviewMutation.mutate({ decision, reviewNotes: reviewNotes || undefined });
  };

  const handleConvert = () => {
    if (!areaId || !assignedTo) return;
    convertMutation.mutate(
      {
        areaId,
        assignedTo,
        caseType,
        pruningAction,
        scheduledDate: scheduledDate || undefined,
      },
      { onSuccess: () => router.push('/pruning-requests') },
    );
  };

  const expectedLabel = request.expectedDate
    ? new Date(request.expectedDate).toLocaleDateString('id-ID')
    : request.expectedYear && request.expectedIsoWeek
      ? `Minggu ${request.expectedIsoWeek} / ${request.expectedYear}`
      : '-';

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push('/pruning-requests')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke daftar
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-nb-h2 text-nb-black">{request.referenceCode}</h1>
          <p className="mt-0.5 text-nb-body-sm text-nb-gray-600">{request.address}</p>
        </div>
        <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[request.status]} dot>
          {PRUNING_REQUEST_STATUS_LABELS[request.status]}
        </StatusPill>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <SectionCard title="Detail Permohonan">
            <dl className="space-y-2.5 text-nb-body-sm">
              <Field label="Kecamatan" value={request.kecamatanName ?? '-'} />
              <Field label="Rayon" value={request.rayon?.name ?? '-'} />
              <Field label="Pengirim" value={request.submitter?.full_name ?? '-'} />
              <Field label="Minggu Diharapkan" value={expectedLabel} />
              <Field
                label="Jumlah Pohon"
                value={String(request.treeCount ?? request.estimatedPlantCount ?? '-')}
              />
              <Field label="Tinggi Pohon" value={request.treeHeightEstimate ?? '-'} />
              <Field label="Diameter Batang" value={request.treeDiameterEstimate ?? '-'} />
              <Field label="Lokasi GPS" value={`${request.gpsLat}, ${request.gpsLng}`} mono />
              {request.notes && <Field label="Catatan" value={request.notes} />}
            </dl>
          </SectionCard>

          <SectionCard title="Kontak">
            <dl className="space-y-2.5 text-nb-body-sm">
              <Field label="Pengaju Lapangan" value={request.requesterName ?? '-'} />
              <Field label="HP Pengaju" value={request.requesterPhone ?? '-'} mono />
              <Field label="Ketua RT" value={request.rtLeaderName ?? '-'} />
              <Field label="HP Ketua RT" value={request.rtLeaderPhone ?? '-'} mono />
            </dl>
          </SectionCard>

          {request.photoUrls.length > 0 && (
            <SectionCard title="Foto" meta={`${request.photoUrls.length} foto`}>
              <div className="grid grid-cols-3 gap-2">
                {request.photoUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="group relative overflow-hidden rounded-nb-base border-2 border-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
                    aria-label={`Perbesar foto ${i + 1}`}
                  >
                    <Image
                      src={url}
                      alt={`Foto ${i + 1}`}
                      width={160}
                      height={120}
                      className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-5">
          {request.reviewer && (
            <SectionCard title="Riwayat Tinjauan">
              <dl className="space-y-2.5 text-nb-body-sm">
                <Field label="Ditinjau Oleh" value={request.reviewer.full_name} />
                <Field
                  label="Tanggal Tinjauan"
                  value={
                    request.reviewedAt
                      ? new Date(request.reviewedAt).toLocaleString('id-ID')
                      : '-'
                  }
                  mono
                />
                <Field label="Catatan Tinjauan" value={request.reviewNotes ?? '-'} />
              </dl>
            </SectionCard>
          )}

          {request.assignedTaskId && (
            <SectionCard title="Tugas Terkait">
              <Link
                href={`/tasks/${request.assignedTaskId}`}
                className="inline-flex items-center gap-1.5 font-semibold text-nb-primary hover:underline"
              >
                Lihat tugas terkait <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </SectionCard>
          )}

          {canReview && (
            <SectionCard title="Tinjauan">
              <div className="space-y-3">
                <Textarea
                  label="Catatan Tinjauan (opsional)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Lokasi sesuai, prioritaskan minggu ini."
                />
                {reviewMutation.isError && (
                  <p role="alert" className="text-nb-body-sm text-nb-danger">
                    Gagal mengirim tinjauan. Coba lagi.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    onClick={() => handleReview('approve')}
                    loading={reviewMutation.isPending}
                  >
                    Setujui
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview('reject')}
                    loading={reviewMutation.isPending}
                  >
                    Tolak
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {canConvert && (
            <SectionCard
              title="Tugaskan ke Petugas"
              meta="Tanggal kosong dipilih otomatis dalam minggu diminta"
            >
              {(areaOptions.length === 0 || assigneeOptions.length === 0) && (
                <p
                  role="alert"
                  className="mb-3 rounded-nb-base border-2 border-nb-warning bg-nb-warning-light px-3 py-2 text-nb-body-sm text-nb-black"
                >
                  Tidak ada area atau petugas yang tersedia untuk rayon ini. Hubungi administrator.
                </p>
              )}
              <div className="space-y-3">
                <FormSelect
                  label="Area"
                  value={areaId}
                  onChange={setAreaId}
                  options={[{ label: '— Pilih area —', value: '' }, ...areaOptions]}
                />
                <FormSelect
                  label="Ditugaskan Ke"
                  value={assignedTo}
                  onChange={setAssignedTo}
                  options={[{ label: '— Pilih petugas —', value: '' }, ...assigneeOptions]}
                />
                <FormSelect
                  label="Tipe Kasus"
                  value={caseType}
                  onChange={(v) => setCaseType(v as CaseType)}
                  options={CASE_TYPES}
                />
                <FormSelect
                  label="Aksi Pemangkasan"
                  value={pruningAction}
                  onChange={(v) => setPruningAction(v as PruningAction)}
                  options={PRUNING_ACTIONS}
                />
                <FormField label="Tanggal Pasti (opsional)">
                  {(p) => (
                    <DatePicker
                      id={p.id}
                      value={scheduledDate || undefined}
                      onValueChange={(v) => setScheduledDate(v ?? '')}
                    />
                  )}
                </FormField>
                {convertMutation.isError && (
                  <p role="alert" className="text-nb-body-sm text-nb-danger">
                    Gagal mengonversi ke tugas. Periksa kapasitas minggu dan coba lagi.
                  </p>
                )}
                <Button
                  onClick={handleConvert}
                  loading={convertMutation.isPending}
                  disabled={!areaId || !assignedTo}
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  Buat Tugas
                </Button>
              </div>
            </SectionCard>
          )}

          {!canReview && !canConvert && !request.reviewer && (
            <SectionCard>
              <p className="py-2 text-nb-body-sm text-nb-gray-600">
                Tidak ada aksi tersedia untuk status saat ini.
              </p>
            </SectionCard>
          )}
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightbox && (
            <Image
              src={lightbox}
              alt="Pratinjau foto"
              width={1024}
              height={768}
              className="h-auto w-full rounded-nb-base object-contain"
              unoptimized
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <dt className="text-nb-gray-600">{label}</dt>
      <dd className={mono ? 'font-mono text-[13px] text-nb-black' : 'text-nb-black'}>{value}</dd>
    </div>
  );
}
