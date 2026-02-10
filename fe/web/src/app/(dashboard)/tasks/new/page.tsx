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
import { Card, CardHeader, CardContent, FormInput, FormSelect, Button, Textarea } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';

// Access control
const ALLOWED_ROLES = ['admin', 'kepala_rayon', 'koordinator_lapangan'];

export default function CreateTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('none');
  const [areaId, setAreaId] = useState('none');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch workers and areas
  const { data: usersData } = useUsers({ role: 'worker', limit: 1000 });
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
        assigned_to: assignedTo !== 'none' ? assignedTo : undefined,
        area_id: areaId !== 'none' ? areaId : undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      router.push('/tasks');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
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
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/tasks" className="text-nb-primary hover:underline font-semibold">
              Tugas
            </Link>
          </li>
          <li className="text-nb-gray-400">/</li>
          <li className="text-nb-gray-600">Buat Baru</li>
        </ol>
      </nav>

      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/tasks')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Tugas
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Buat Tugas Baru</h1>
        <p className="text-nb-gray-600 mt-1">Tugaskan pekerjaan kepada pekerja</p>
      </div>

      {/* Form */}
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
              {/* Title */}
              <FormInput
                label="Judul Tugas"
                type="text"
                placeholder="Contoh: Penyiraman Area Timur"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              {/* Description */}
              <Textarea
                label="Deskripsi"
                rows={4}
                placeholder="Detail tugas yang harus dikerjakan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Worker Select */}
              <FormSelect
                label="Ditugaskan Ke (Opsional)"
                value={assignedTo}
                onChange={(value) => setAssignedTo(value as string)}
                options={[
                  { value: 'none', label: 'Belum ditugaskan' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.email})`,
                  })),
                ]}
              />

              {/* Area Select */}
              <FormSelect
                label="Area (Opsional)"
                value={areaId}
                onChange={(value) => setAreaId(value as string)}
                options={[
                  { value: 'none', label: 'Pilih Area' },
                  ...areas.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.code})`,
                  })),
                ]}
              />

              {/* Priority */}
              <FormSelect
                label="Prioritas"
                value={priority}
                onChange={(value) => setPriority(value as TaskPriority)}
                options={priorityOptions}
              />

              {/* Due Date */}
              <FormInput
                label="Tenggat Waktu (Opsional)"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button type="submit" loading={createMutation.isPending}>
                Buat Tugas
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/tasks')}
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
