/**
 * Create Task Page
 * Form to create new task assignment
 * Access: Admin + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useCreateTask, type TaskPriority } from '@/lib/api/tasks';
import { useUsers } from '@/lib/api/users';
import { useAreas } from '@/lib/api/areas';
import { NBCard, NBCardHeader, NBCardContent, NBInput, NBSelect, NBButton } from '@/components/nb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CreateTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [areaId, setAreaId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  // Access control
  const allowedRoles = ['Admin', 'KepalaRayon', 'KoordinatorLapangan'];

  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch workers and areas
  const { data: usersData } = useUsers({ role: 'Worker', limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });

  const createMutation = useCreateTask();

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
        assigned_to: assignedTo || undefined,
        area_id: areaId || undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      router.push('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat tugas');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  const users = usersData?.data || [];
  const areas = areasData?.data || [];

  const priorityOptions = [
    { value: 'low', label: 'Rendah' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Tinggi' },
    { value: 'urgent', label: 'Mendesak' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/tasks" className="text-nb-primary hover:underline font-semibold">
              Tugas
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">Buat Baru</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Buat Tugas Baru</h1>
        <p className="text-gray-600 mt-1">Tugaskan pekerjaan kepada pekerja</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <NBCard variant="elevated">
          <NBCardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi Tugas</h2>
          </NBCardHeader>
          <NBCardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-100 border-3 border-black rounded-lg">
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <NBInput
                label="Judul Tugas"
                type="text"
                placeholder="Contoh: Penyiraman Area Timur"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-nb-black mb-2">
                  Deskripsi
                </label>
                <textarea
                  className="w-full px-4 py-3 border-3 border-black rounded-lg font-medium focus:outline-none focus:ring-3 focus:ring-nb-primary focus:ring-offset-0"
                  rows={4}
                  placeholder="Detail tugas yang harus dikerjakan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Worker Select */}
              <NBSelect
                label="Ditugaskan Ke (Opsional)"
                value={assignedTo}
                onChange={(value) => setAssignedTo(value as string)}
                options={[
                  { value: '', label: 'Belum ditugaskan' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.email})`,
                  })),
                ]}
              />

              {/* Area Select */}
              <NBSelect
                label="Area (Opsional)"
                value={areaId}
                onChange={(value) => setAreaId(value as string)}
                options={[
                  { value: '', label: 'Pilih Area' },
                  ...areas.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.code})`,
                  })),
                ]}
              />

              {/* Priority */}
              <NBSelect
                label="Prioritas"
                value={priority}
                onChange={(value) => setPriority(value as TaskPriority)}
                options={priorityOptions}
              />

              {/* Due Date */}
              <NBInput
                label="Tenggat Waktu (Opsional)"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <NBButton type="submit" variant="primary" loading={createMutation.isPending}>
                Buat Tugas
              </NBButton>
              <NBButton
                type="button"
                variant="secondary"
                onClick={() => router.push('/tasks')}
              >
                Batal
              </NBButton>
            </div>
          </NBCardContent>
        </NBCard>
      </form>
    </div>
  );
}
