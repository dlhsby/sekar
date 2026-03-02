/**
 * Task Detail Page (Phase 2C - 8 statuses, verification workflow)
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useTask, useUntagTask, useVerifyTask, useRequestRevision } from '@/lib/api/tasks';
import { Card, CardHeader, CardContent, Badge, Button, FormInput } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { TASK_MANAGER_ROLES, TASK_VERIFIER_ROLES, hasRole } from '@/lib/constants/roles';
import { TASK_STATUS_LABELS, TASK_STATUS_BADGES } from '@/lib/constants/tasks';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

const PRIORITY_BADGES: Record<string, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  low: 'secondary',
  normal: 'success',
  high: 'warning',
  urgent: 'destructive',
};

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const { id: taskId } = use(params);

  const verifyMutation = useVerifyTask();
  const revisionMutation = useRequestRevision();
  const untagMutation = useUntagTask();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, TASK_MANAGER_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: task, isLoading } = useTask(taskId);

  if (authLoading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, TASK_MANAGER_ROLES)) return null;

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-nb-gray-600 font-semibold">Tugas tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const canVerify =
    hasRole(user.role, TASK_VERIFIER_ROLES) && task.status === 'completed';

  const handleVerify = async () => {
    await verifyMutation.mutateAsync(taskId);
  };

  const handleRevision = async () => {
    if (!revisionReason.trim()) return;
    await revisionMutation.mutateAsync({ taskId, reason: revisionReason });
    setShowRevisionForm(false);
    setRevisionReason('');
  };

  const handleUntag = async (userId: string) => {
    await untagMutation.mutateAsync({ taskId, userId });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/tasks" className="text-nb-primary hover:underline font-semibold">
              Tugas
            </Link>
          </li>
          <li className="text-nb-gray-400">/</li>
          <li className="text-nb-gray-600">Detail</li>
        </ol>
      </nav>

      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/tasks')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Tugas
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black mb-2">{task.title}</h1>
          <div className="flex gap-2">
            <Badge variant={TASK_STATUS_BADGES[task.status]} size="lg">
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            <Badge variant={PRIORITY_BADGES[task.priority] || 'secondary'} size="lg">
              {PRIORITY_LABELS[task.priority] || task.priority}
            </Badge>
          </div>
        </div>
        {canVerify && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={handleVerify}
              loading={verifyMutation.isPending}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Verifikasi
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRevisionForm(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Minta Revisi
            </Button>
          </div>
        )}
      </div>

      {/* Revision Form */}
      {showRevisionForm && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">Alasan Revisi</h3>
              <FormInput
                label="Alasan"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Masukkan alasan revisi..."
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevision}
                  disabled={!revisionReason.trim() || revisionMutation.isPending}
                  loading={revisionMutation.isPending}
                >
                  Kirim Revisi
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionReason('');
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi Tugas</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.description && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Deskripsi</div>
                  <div className="text-nb-gray-700">{task.description}</div>
                </div>
              )}
              {task.due_date && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tenggat Waktu</div>
                  <div className="font-bold text-nb-black">
                    {new Date(task.due_date).toLocaleDateString('id-ID')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Dibuat</div>
                <div className="font-bold text-nb-black">
                  {new Date(task.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              {task.activity_type && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tipe Aktivitas</div>
                  <div className="font-bold text-nb-black">{task.activity_type.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Info */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Penugasan</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.creator && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Pembuat</div>
                  <div className="font-bold text-nb-black">{task.creator.full_name}</div>
                </div>
              )}
              {task.assigned_to && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Ditugaskan Ke</div>
                  <div className="font-bold text-nb-black">{task.assigned_to.full_name}</div>
                </div>
              )}
              {task.assigned_by && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Ditugaskan Oleh</div>
                  <div className="font-bold text-nb-black">{task.assigned_by.full_name}</div>
                </div>
              )}
              {task.assigned_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tanggal Penugasan</div>
                  <div className="text-nb-black">
                    {new Date(task.assigned_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
              {task.area && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Area</div>
                  <div className="font-bold text-nb-black">{task.area.name}</div>
                </div>
              )}
              {task.rayon && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Rayon</div>
                  <div className="font-bold text-nb-black">{task.rayon.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tagged Users */}
      {task.tags && task.tags.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">
              Ditandai ({task.tags.length})
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {task.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border-2 border-nb-black bg-white"
                >
                  <div className="font-semibold text-nb-black">
                    {tag.user?.full_name || tag.user_id}
                  </div>
                  {task.created_by === user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUntag(tag.user_id)}
                      disabled={untagMutation.isPending}
                      leftIcon={<X className="w-3 h-3" />}
                    >
                      Hapus Tag
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decline Info */}
      {task.status === 'declined' && task.decline_reason && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Penolakan</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Alasan Penolakan</div>
                <div className="text-nb-gray-700">{task.decline_reason}</div>
              </div>
              {task.declined_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tanggal Tolak</div>
                  <div className="text-nb-black">
                    {new Date(task.declined_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Info */}
      {(task.status === 'completed' || task.status === 'verified') && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Penyelesaian</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.completion_notes && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Catatan Penyelesaian</div>
                  <div className="text-nb-gray-700">{task.completion_notes}</div>
                </div>
              )}
              {task.completed_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tanggal Selesai</div>
                  <div className="text-nb-black">
                    {new Date(task.completed_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
              {task.completion_photo_urls && task.completion_photo_urls.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                    Foto ({task.completion_photo_urls.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {task.completion_photo_urls.map((url, index) => (
                      <div
                        key={index}
                        className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={`Foto penyelesaian ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Info */}
      {task.status === 'verified' && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Verifikasi</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {task.verifier && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Diverifikasi Oleh</div>
                  <div className="font-bold text-nb-black">{task.verifier.full_name}</div>
                </div>
              )}
              {task.verified_at && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Tanggal Verifikasi</div>
                  <div className="text-nb-black">
                    {new Date(task.verified_at).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision Info */}
      {task.status === 'revision_needed' && task.revision_reason && (
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Permintaan Revisi</h2>
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-sm font-semibold text-nb-gray-600">Alasan Revisi</div>
              <div className="text-nb-gray-700">{task.revision_reason}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
