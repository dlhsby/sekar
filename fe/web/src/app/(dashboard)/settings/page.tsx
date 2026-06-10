/**
 * Settings Page
 * User profile and preferences
 * Access: Admin only
 */

'use client';

import { Card, CardContent, CardHeader, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

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

  if (!user || !hasRole(user.role, ADMIN_ROLES)) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
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
          <p className="text-nb-gray-600">
            Fitur belum tersedia. Hubungi administrator sistem untuk mengubah password.
          </p>
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
