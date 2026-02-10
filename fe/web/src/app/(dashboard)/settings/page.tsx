/**
 * Settings Page
 * User profile and preferences
 * Access: Admin only
 */

'use client';

import { Card, CardContent, CardHeader, Button, FormInput } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Password change schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [notifications, setNotifications] = useState(true);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      redirect('/');
    }
  }, [user, loading]);

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      // TODO: Implement password change API call when backend endpoint is ready
      // await apiClient.post('/users/change-password', {
      //   current_password: data.currentPassword,
      //   new_password: data.newPassword,
      // });

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPasswordSuccess(true);
      reset();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-nb-black mb-2">Pengaturan</h1>
        <p className="text-nb-gray-600">Kelola profil dan preferensi Anda</p>
      </div>

      {/* User Profile Card */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Profil Pengguna</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-nb-gray-700 mb-1">
                Nama Lengkap
              </label>
              <div className="text-nb-black font-medium">{user.full_name}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-nb-gray-700 mb-1">Username</label>
              <div className="text-nb-black font-medium">{user.username}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-nb-gray-700 mb-1">Role</label>
              <div className="text-nb-black font-medium capitalize">{user.role}</div>
            </div>
            <p className="text-xs text-nb-gray-600 mt-4">
              Untuk mengubah informasi profil, hubungi administrator sistem.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Ubah Password</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handlePasswordChange)} className="space-y-4">
            <FormInput
              label="Password Saat Ini"
              type="password"
              placeholder="Masukkan password saat ini"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />

            <FormInput
              label="Password Baru"
              type="password"
              placeholder="Masukkan password baru (minimal 8 karakter)"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <FormInput
              label="Konfirmasi Password Baru"
              type="password"
              placeholder="Konfirmasi password baru"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {passwordSuccess && (
              <div className="p-4 bg-nb-success-light border-2 border-nb-success text-nb-success rounded-none">
                <p className="font-semibold">Password berhasil diubah!</p>
              </div>
            )}

            {passwordError && (
              <div
                className="p-4 bg-nb-danger-light border-2 border-nb-danger text-nb-danger rounded-none"
                role="alert"
                aria-live="polite"
              >
                <p className="font-semibold">{passwordError}</p>
              </div>
            )}

            <Button type="submit" variant="default" loading={passwordLoading}>
              Ubah Password
            </Button>

            <p className="text-xs text-nb-gray-600 mt-2">
              Note: Fitur ubah password akan aktif setelah endpoint backend tersedia.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Preferensi</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Language Toggle */}
            <div>
              <label className="block text-sm font-semibold text-nb-gray-700 mb-2">
                Bahasa / Language
              </label>
              <div className="flex gap-2">
                <Button
                  variant={language === 'id' ? 'default' : 'outline'}
                  onClick={() => setLanguage('id')}
                >
                  Bahasa Indonesia
                </Button>
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  onClick={() => setLanguage('en')}
                >
                  English
                </Button>
              </div>
              <p className="text-xs text-nb-gray-600 mt-2">
                Note: Fitur multi-bahasa akan aktif di Phase 4.
              </p>
            </div>

            {/* Notification Toggle */}
            <div>
              <label className="block text-sm font-semibold text-nb-gray-700 mb-2">
                Notifikasi
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications}
                  onClick={() => setNotifications(!notifications)}
                  className={`
                    relative inline-flex h-6 w-12 items-center rounded-none
                    border-2 border-nb-black transition-colors
                    ${notifications ? 'bg-nb-primary' : 'bg-nb-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform bg-white border-2 border-nb-black
                      transition-transform
                      ${notifications ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
                <span className="text-sm text-nb-gray-700">
                  {notifications ? 'Notifikasi Aktif' : 'Notifikasi Nonaktif'}
                </span>
              </div>
              <p className="text-xs text-nb-gray-600 mt-2">
                Aktifkan untuk menerima notifikasi push tentang tugas dan laporan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info Card */}
      <Card variant="outlined">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Informasi Sistem</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm divide-y divide-nb-black/10">
            <div className="flex justify-between pb-2">
              <span className="text-nb-gray-600">Versi Aplikasi:</span>
              <span className="font-semibold text-nb-black">2.0.0 (Phase 2)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-nb-gray-600">Environment:</span>
              <span className="font-semibold text-nb-black">
                {process.env.NODE_ENV || 'development'}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-nb-gray-600">Last Updated:</span>
              <span className="font-semibold text-nb-black">February 5, 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
