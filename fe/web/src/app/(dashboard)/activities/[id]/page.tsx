/**
 * Activity Detail Page (Phase 2C)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useActivity } from '@/lib/api/activities';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';

interface ActivityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { id: activityId } = use(params);

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: activity, isLoading } = useActivity(activityId);

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

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  if (!activity) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-nb-gray-600 font-semibold">Aktivitas tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/activities" className="text-nb-primary hover:underline font-semibold">
              Aktivitas
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
          onClick={() => router.push('/activities')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar Aktivitas
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-nb-black mb-2">Detail Aktivitas</h1>
        <Badge variant="default" size="lg">
          {activity.activity_type?.name || 'Unknown'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-bold text-nb-black">Informasi</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Pengguna</div>
                <div className="font-bold text-nb-black">{activity.user?.full_name}</div>
                <div className="text-sm text-nb-gray-600">{activity.user?.username}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Area</div>
                <div className="font-bold text-nb-black">{activity.area?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Tipe Aktivitas</div>
                <div className="font-bold text-nb-black">{activity.activity_type?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-nb-gray-600">Tanggal & Waktu</div>
                <div className="font-bold text-nb-black">
                  {new Date(activity.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              {(activity.gps_lat || activity.gps_lng) && (
                <div>
                  <div className="text-sm font-semibold text-nb-gray-600">Lokasi GPS</div>
                  <div className="font-mono text-sm">
                    {activity.gps_lat}, {activity.gps_lng}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {activity.photo_urls && activity.photo_urls.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-xl font-bold text-nb-black">
                Foto ({activity.photo_urls.length})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {activity.photo_urls.map((url, index) => (
                  <div
                    key={index}
                    className="bg-nb-gray-100 border-2 border-nb-black overflow-hidden"
                  >
                    <img src={url} alt={`Foto aktivitas ${index + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Deskripsi</h2>
        </CardHeader>
        <CardContent>
          <p className="text-nb-gray-700">{activity.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
