/**
 * Edit Schedule Page
 * Form to edit existing worker schedule
 * Access: Admin + KoordinatorLapangan
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { useSchedule, useUpdateSchedule } from '@/lib/api/schedules';
import { useUsers } from '@/lib/api/users';
import { useAreas } from '@/lib/api/areas';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { Card, CardHeader, CardContent, Button, FormInput, FormSelect } from '@/components/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { SCHEDULE_MANAGER_ROLES } from '@/lib/constants/roles';

interface EditSchedulePageProps {
  // Next 16: route params are a Promise and must be unwrapped with `use()`.
  params: Promise<{ id: string }>;
}

export default function EditSchedulePage({ params }: EditSchedulePageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  // Fetch data
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(id);
  const { data: usersData } = useUsers({ limit: 1000 });
  const { data: areasData } = useAreas({ limit: 1000 });
  const { data: shifts } = useShiftDefinitions();
  const updateMutation = useUpdateSchedule(id);

  // Initialize state from schedule data (only on first render when schedule loads)
  const [userId, setUserId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Initialize form with schedule data once loaded
  useEffect(() => {
    if (schedule && userId === '') {
      setUserId(schedule.user_id);
      setAreaId(schedule.area_id);
      setShiftId(schedule.shift_definition_id);
      setEffectiveDate(schedule.effective_date.split('T')[0]);
      setEndDate(schedule.end_date ? schedule.end_date.split('T')[0] : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  // Access control (ADR-009 roles — the prior ['admin','koordinator_lapangan']
  // gate matched no current role and redirected every user away).
  useEffect(() => {
    if (!authLoading && user && !SCHEDULE_MANAGER_ROLES.includes(user.role)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || scheduleLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary"></div>
      </div>
    );
  }

  if (!SCHEDULE_MANAGER_ROLES.includes(user.role)) {
    return null;
  }

  if (!schedule) {
    return (
      <div className="py-12 text-center text-nb-gray-600">Jadwal tidak ditemukan</div>
    );
  }

  const users = usersData?.data || [];
  const areas = areasData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!userId || !areaId || !shiftId || !effectiveDate) {
      setError('Semua field wajib diisi');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        area_id: areaId,
        shift_definition_id: shiftId,
        effective_date: effectiveDate,
        end_date: endDate || undefined,
      });

      router.push('/schedules');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button
        type="button"
        onClick={() => router.push('/schedules')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke daftar jadwal
      </button>

      <Card variant="elevated">
        <CardHeader>
          <h1 className="text-nb-h3 text-nb-black">Edit Jadwal</h1>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div
                className="p-4 border-2 border-nb-danger bg-nb-danger-light text-nb-danger"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Worker Select */}
            <FormSelect
              label="Pekerja"
              required
              value={userId}
              onChange={(value) => setUserId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Pekerja' },
                ...users.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
              helperText={
                <span className="text-nb-gray-600">Pilih pekerja yang akan dijadwalkan</span>
              }
            />

            {/* Area Select */}
            <FormSelect
              label="Area"
              required
              value={areaId}
              onChange={(value) => setAreaId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Area' },
                ...areas.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.code})`,
                })),
              ]}
              helperText={<span className="text-nb-gray-600">Area penugasan pekerja</span>}
            />

            {/* Shift Select */}
            <FormSelect
              label="Shift"
              required
              value={shiftId}
              onChange={(value) => setShiftId(value as string)}
              options={[
                { value: 'none', label: 'Pilih Shift' },
                ...(shifts || []).map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.start_time} - ${s.end_time})`,
                })),
              ]}
              helperText={<span className="text-nb-gray-600">Jam kerja pekerja</span>}
            />

            {/* Effective Date */}
            <FormInput
              label="Tanggal Mulai"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              helperText={<span className="text-nb-gray-600">Tanggal berlaku jadwal</span>}
            />

            {/* End Date */}
            <FormInput
              label="Tanggal Selesai (Opsional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              helperText={
                <span className="text-nb-gray-600">Kosongkan jika jadwal berlangsung terus</span>
              }
            />

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-4">
              <Link href="/schedules">
                <Button variant="secondary" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" loading={updateMutation.isPending}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
