/**
 * Rayons List Page
 * Display all rayons with statistics
 * Access: Admin + TopManagement only
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useRayonsWithStats } from '@/lib/api/rayons';
import RayonCard from '@/components/rayons/RayonCard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RayonsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { rayons, stats, isLoading } = useRayonsWithStats();

  // Access control: Only Admin and TopManagement
  useEffect(() => {
    if (!authLoading && user && !['admin', 'top_management'].includes(user.role)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

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

  // Access denied for non-authorized roles
  if (!['admin', 'top_management'].includes(user.role)) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-nb-black mb-2">
          Manajemen Rayon
        </h1>
        <p className="text-gray-600">
          Kelola dan monitor 7 rayon di Kota Surabaya
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
            <RayonCard
              key={i}
              rayon={{ id: '', name: '', code: '', created_at: '', updated_at: '' }}
              loading={true}
            />
          ))}
        </div>
      )}

      {/* Rayons Grid */}
      {!isLoading && rayons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rayons.map((rayon) => {
            const rayonStats = stats.find(s => s.rayon_id === rayon.id);
            return (
              <RayonCard
                key={rayon.id}
                rayon={rayon}
                stats={rayonStats}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && rayons.length === 0 && (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Tidak Ada Rayon
          </h3>
          <p className="text-gray-600">
            Belum ada rayon yang terdaftar dalam sistem.
          </p>
        </div>
      )}
    </div>
  );
}
