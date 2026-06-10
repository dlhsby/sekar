/**
 * Pruning Request detail page (Phase 3 — admin disposition)
 *
 * Shows the full kecamatan submission and exposes the two terminal admin
 * actions: review (approve/reject) and assign-to-task. Mirrors the mobile
 * RequestDetailScreen + AssignToTaskSheet, in two stacked cards instead of
 * a sheet to suit the desktop viewport.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormInput,
  FormSelect,
  Textarea,
} from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import {
  PRUNING_REQUEST_ADMIN_ROLES,
  PRUNING_REQUEST_STATUS_BADGES,
  PRUNING_REQUEST_STATUS_LABELS,
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
    () =>
      (areasResponse?.data ?? []).map((a) => ({ label: a.name, value: a.id })),
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

  if (isLoading) {
    return <div className="container mx-auto p-6">Memuat permohonan…</div>;
  }
  if (isError || !request) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-nb-base border-2 border-nb-danger bg-white p-4 text-nb-danger">
          Gagal memuat permohonan. Coba kembali ke daftar.
        </div>
        <Link
          href="/pruning-requests"
          className="text-nb-primary font-semibold hover:underline mt-3 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
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
      {
        onSuccess: () => router.push('/pruning-requests'),
      },
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link
        href="/pruning-requests"
        className="text-nb-primary font-semibold hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-nb-black">{request.referenceCode}</h1>
          <p className="text-nb-gray-600 mt-1">{request.address}</p>
        </div>
        <Badge variant={PRUNING_REQUEST_STATUS_BADGES[request.status]}>
          {PRUNING_REQUEST_STATUS_LABELS[request.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-nb-h3 font-bold uppercase">Detail Permohonan</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Kecamatan" value={request.kecamatanName ?? '-'} />
            <Field label="Rayon" value={request.rayon?.name ?? '-'} />
            <Field label="Pengirim" value={request.submitter?.full_name ?? '-'} />
            <Field label="Pengaju Lapangan" value={request.requesterName ?? '-'} />
            <Field label="HP Pengaju" value={request.requesterPhone ?? '-'} />
            <Field label="Ketua RT" value={request.rtLeaderName ?? '-'} />
            <Field label="HP Ketua RT" value={request.rtLeaderPhone ?? '-'} />
            <Field
              label="Minggu / Tanggal Diharapkan"
              value={
                request.expectedDate
                  ? new Date(request.expectedDate).toLocaleDateString('id-ID')
                  : request.expectedYear && request.expectedIsoWeek
                    ? `Minggu ${request.expectedIsoWeek} / ${request.expectedYear}`
                    : '-'
              }
            />
            <Field label="Jumlah Pohon" value={String(request.treeCount ?? request.estimatedPlantCount ?? '-')} />
            <Field label="Tinggi Pohon" value={request.treeHeightEstimate ?? '-'} />
            <Field label="Diameter Batang" value={request.treeDiameterEstimate ?? '-'} />
            <Field label="Catatan" value={request.notes ?? '-'} />
            <Field label="Lokasi GPS" value={`${request.gpsLat}, ${request.gpsLng}`} />

            {request.photoUrls.length > 0 && (
              <div>
                <div className="font-semibold text-nb-black mb-2">Foto</div>
                <div className="grid grid-cols-3 gap-2">
                  {request.photoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <Image
                        src={url}
                        alt={`Foto ${i + 1}`}
                        width={120}
                        height={120}
                        className="w-full h-24 object-cover rounded border-2 border-nb-black"
                        unoptimized
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {request.reviewer && (
              <div className="pt-3 border-t-2 border-nb-gray-200">
                <Field label="Ditinjau Oleh" value={request.reviewer.full_name} />
                <Field
                  label="Tanggal Tinjauan"
                  value={
                    request.reviewedAt
                      ? new Date(request.reviewedAt).toLocaleString('id-ID')
                      : '-'
                  }
                />
                <Field label="Catatan Tinjauan" value={request.reviewNotes ?? '-'} />
              </div>
            )}

            {request.assignedTaskId && (
              <div className="pt-3">
                <Link
                  href={`/tasks/${request.assignedTaskId}`}
                  className="text-nb-primary font-semibold hover:underline"
                >
                  Lihat Tugas Terkait →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canReview && (
            <Card>
              <CardHeader>
                <h2 className="text-nb-h3 font-bold uppercase">Tinjauan</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  label="Catatan Tinjauan (opsional)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Lokasi sesuai, prioritaskan minggu ini."
                />
                {reviewMutation.isError && (
                  <div className="text-sm text-nb-danger">
                    Gagal mengirim tinjauan. Coba lagi.
                  </div>
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
              </CardContent>
            </Card>
          )}

          {canConvert && (
            <Card>
              <CardHeader>
                <h2 className="text-nb-h3 font-bold uppercase">Tugaskan ke Petugas</h2>
                <p className="text-sm text-nb-gray-600 mt-1">
                  Tanggal kosong akan dipilih otomatis dalam minggu yang diminta kecamatan.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <FormInput
                  label="Tanggal Pasti (opsional)"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                {convertMutation.isError && (
                  <div className="text-sm text-nb-danger">
                    Gagal mengonversi ke tugas. Periksa kapasitas minggu dan coba lagi.
                  </div>
                )}
                <Button
                  onClick={handleConvert}
                  loading={convertMutation.isPending}
                  disabled={!areaId || !assignedTo}
                >
                  Buat Tugas
                </Button>
              </CardContent>
            </Card>
          )}

          {!canReview && !canConvert && (
            <Card>
              <CardContent className="py-6 text-sm text-nb-gray-600">
                Tidak ada aksi tersedia untuk status saat ini.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-nb-gray-600">{label}</span>
      <span className="text-nb-black">{value}</span>
    </div>
  );
}
