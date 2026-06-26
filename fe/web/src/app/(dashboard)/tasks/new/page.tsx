/**
 * Create Task Page (Phase 2C - rayon, hierarchical assignment)
 * Access: TASK_MANAGER_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useCreateTask, type TaskPriority } from '@/lib/api/tasks';
import { useUsers } from '@/lib/api/users';
import { useAreas } from '@/lib/api/areas';
import { useRayons } from '@/lib/api/rayons';
import {
  Card,
  CardHeader,
  CardContent,
  FormInput,
  FormSelect,
  Button,
  Textarea,
  PageHeader,
  Field,
  DateTimePicker,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  TASK_MANAGER_ROLES,
  VALID_TASK_ASSIGNMENTS,
  hasRole,
  ROLE_LABELS,
} from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State hooks - must be called unconditionally (Rules of Hooks)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('none');
  const [areaId, setAreaId] = useState('none');
  const [rayonId, setRayonId] = useState('none');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  // Data fetching hooks - always call (enabled by query client)
  const { data: usersData } = useUsers({ limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });
  const { data: rayonsData } = useRayons();

  const createMutation = useCreateTask();

  // Access control check - NO redirect in useEffect, instead conditionally render below
  const hasAccess = user && hasRole(user.role, TASK_MANAGER_ROLES);

  // Get assignable roles based on current user role
  const assignableRoles = user ? VALID_TASK_ASSIGNMENTS[user.role] || [] : [];

  // Loading state - show spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary" />
      </div>
    );
  }

  // Access denied - redirect immediately without rendering form
  if (!hasAccess) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title) {
      setError('Judul tugas wajib diisi');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        description: description || undefined,
        assigned_to: assignedTo !== 'none' ? assignedTo : undefined,
        area_id: areaId !== 'none' ? areaId : undefined,
        rayon_id: rayonId !== 'none' ? rayonId : undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      router.push('/tasks');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Filter users by assignable roles
  const assignableUsers = (usersData?.data || []).filter((u) =>
    assignableRoles.includes(u.role as UserRole)
  );

  const areas = areasData?.data || [];
  const rayons = rayonsData || [];

  const priorityOptions = [
    { value: 'low', label: 'Rendah' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Tinggi' },
    { value: 'urgent', label: 'Mendesak' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => router.push('/tasks')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke daftar tugas
      </button>

      <PageHeader
        description="Tugaskan pekerjaan kepada petugas."
      />
      {assignableRoles.length > 0 && (
        <p className="-mt-2 text-nb-caption text-nb-gray-500">
          Dapat ditugaskan ke: {assignableRoles.map((r) => ROLE_LABELS[r]).join(', ')}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi Tugas</h2>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-nb-danger-light border-2 border-nb-black">
                <p className="text-nb-danger font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <FormInput
                label="Judul Tugas"
                type="text"
                placeholder="Contoh: Penyiraman Area Timur"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Textarea
                label="Deskripsi"
                rows={4}
                placeholder="Detail tugas yang harus dikerjakan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <FormSelect
                label="Ditugaskan Ke (Opsional)"
                value={assignedTo}
                onChange={(value) => setAssignedTo(value)}
                options={[
                  { value: 'none', label: 'Belum ditugaskan' },
                  ...assignableUsers.map((u) => ({
                    value: u.id,
                    label: `${u.full_name || u.username} (${ROLE_LABELS[u.role] || u.role})`,
                  })),
                ]}
              />

              <FormSelect
                label="Rayon (Opsional)"
                value={rayonId}
                onChange={(value) => setRayonId(value)}
                options={[
                  { value: 'none', label: 'Pilih Rayon' },
                  ...rayons.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.code})`,
                  })),
                ]}
              />

              <FormSelect
                label="Area (Opsional)"
                value={areaId}
                onChange={(value) => setAreaId(value)}
                options={[
                  { value: 'none', label: 'Pilih Area' },
                  ...areas.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.code})`,
                  })),
                ]}
              />

              <FormSelect
                label="Prioritas"
                value={priority}
                onChange={(value) => setPriority(value as TaskPriority)}
                options={priorityOptions}
              />

              <Field label="Tenggat Waktu (Opsional)">
                {(p) => (
                  <DateTimePicker
                    id={p.id}
                    value={dueDate ? dueDate.replace('T', ' ') : undefined}
                    onValueChange={(v) => setDueDate(v ? v.replace(' ', 'T') : '')}
                  />
                )}
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <Button type="submit" loading={createMutation.isPending}>
                Buat Tugas
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/tasks')}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
