/**
 * Dashboard Home Page (Phase 2C - 8-role system)
 * Role-based dashboard content
 */

'use client';

import { Users, MapPin, Map, Building2, CheckCircle, Clock, FileText } from 'lucide-react';
import { useUser } from '@/lib/auth/hooks';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

// Stats configuration per role group
const ADMIN_STATS = [
  { label: 'Total Users', value: '156', Icon: Users, color: 'default' as const },
  { label: 'Active Areas', value: '42', Icon: MapPin, color: 'success' as const },
  { label: 'Total Rayons', value: '8', Icon: Building2, color: 'warning' as const },
  { label: 'Aktivitas Hari Ini', value: '23', Icon: FileText, color: 'secondary' as const },
];

const MANAGEMENT_STATS = [
  { label: 'All Rayons', value: '8', Icon: Building2, color: 'default' as const },
  { label: 'Petugas Aktif', value: '124', Icon: Users, color: 'success' as const },
  { label: 'Areas Covered', value: '42', Icon: MapPin, color: 'warning' as const },
  { label: 'Aktivitas Hari Ini', value: '23', Icon: FileText, color: 'secondary' as const },
];

const KEPALA_RAYON_STATS = [
  { label: 'Area Rayon Saya', value: '12', Icon: MapPin, color: 'default' as const },
  { label: 'Petugas Aktif', value: '28', Icon: Users, color: 'success' as const },
  { label: 'Tugas Pending', value: '5', Icon: Clock, color: 'warning' as const },
  { label: 'Aktivitas Hari Ini', value: '8', Icon: FileText, color: 'secondary' as const },
];

const KORLAP_STATS = [
  { label: 'Area Saya', value: '5', Icon: MapPin, color: 'default' as const },
  { label: 'Tim Saya', value: '12', Icon: Users, color: 'success' as const },
  { label: 'Tugas Hari Ini', value: '7', Icon: CheckCircle, color: 'warning' as const },
  { label: 'Aktivitas Hari Ini', value: '4', Icon: FileText, color: 'secondary' as const },
];

const STATS_BY_ROLE: Partial<Record<UserRole, typeof ADMIN_STATS>> = {
  admin_system: ADMIN_STATS,
  superadmin: ADMIN_STATS,
  top_management: MANAGEMENT_STATS,
  kepala_rayon: KEPALA_RAYON_STATS,
  korlap: KORLAP_STATS,
};

const WELCOME_MESSAGES: Partial<Record<UserRole, string>> = {
  admin_system: 'Kelola sistem SEKAR dari sini.',
  superadmin: 'Akses penuh ke seluruh sistem SEKAR.',
  top_management: 'Lihat operasional seluruh rayon dan analitik.',
  kepala_rayon: 'Pantau dan kelola kinerja rayon Anda.',
  korlap: 'Koordinasikan tim dan aktivitas area Anda.',
};

// Quick actions configuration
const ADMIN_ACTIONS = [
  { Icon: Users, title: 'Kelola Users', desc: 'Buat, edit, dan kelola akun pengguna', color: 'nb-primary' },
  { Icon: Building2, title: 'Kelola Rayons', desc: 'Konfigurasi rayon dan hierarki', color: 'nb-success' },
  { Icon: MapPin, title: 'Kelola Areas', desc: 'Buat dan konfigurasi area layanan', color: 'nb-warning' },
];

const MONITORING_ACTIONS = [
  { Icon: Map, title: 'Lihat Monitoring', desc: 'Pantau lokasi petugas secara real-time', color: 'nb-primary' },
  { Icon: FileText, title: 'Lihat Aktivitas', desc: 'Tinjau aktivitas yang dilaporkan', color: 'nb-success' },
  { Icon: Clock, title: 'Lihat Jadwal', desc: 'Cek jadwal tim dan shift', color: 'nb-warning' },
];

export default function DashboardPage() {
  const user = useUser();

  const stats = user ? (STATS_BY_ROLE[user.role] || []) : [];
  const welcomeMessage = user ? (WELCOME_MESSAGES[user.role] || '') : '';
  const isAdmin = user?.role === 'admin_system' || user?.role === 'superadmin';
  const quickActions = isAdmin ? ADMIN_ACTIONS : MONITORING_ACTIONS;

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-nb-black mb-2">
          Selamat datang, {user?.full_name || 'User'}!
        </h1>
        <p className="text-nb-gray-600 text-lg">{welcomeMessage}</p>
        {user && (
          <p className="text-sm text-nb-gray-500 mt-1">
            Role: {ROLE_LABELS[user.role] || user.role}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const { Icon } = stat;
          return (
            <Card key={stat.label} variant="elevated">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-start justify-between">
                  <Badge variant={stat.color} size="sm">
                    {stat.label}
                  </Badge>
                  <div aria-label={`${stat.label} icon`}>
                    <Icon className="h-6 w-6 text-nb-gray-400" />
                  </div>
                </div>
                <p className="text-4xl font-extrabold text-nb-black">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Card key={action.title} variant="outlined" interactive className={`hover:border-${action.color}`}>
            <CardContent className="text-center py-8">
              <action.Icon className={`h-12 w-12 mx-auto mb-3 text-${action.color}`} />
              <h3 className="font-bold text-lg text-nb-black">{action.title}</h3>
              <p className="text-nb-gray-600 text-sm mt-1">{action.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
