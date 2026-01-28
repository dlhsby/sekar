/**
 * RayonCard Component
 * Displays rayon information with statistics in Neo Brutalism style
 */

'use client';

import Link from 'next/link';
import { Rayon, RayonStats } from '@/types/models';
import { NBCard, NBCardHeader, NBCardContent, NBCardFooter, NBBadge } from '@/components/nb';
import { formatArea } from '@/lib/utils/geo';

interface RayonCardProps {
  rayon: Rayon;
  stats?: RayonStats;
  loading?: boolean;
}

export default function RayonCard({ rayon, stats, loading }: RayonCardProps) {
  if (loading) {
    return (
      <NBCard variant="elevated">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </NBCard>
    );
  }

  return (
    <Link href={`/rayons/${rayon.id}`}>
      <NBCard
        variant="elevated"
        interactive
        className="h-full"
      >
        <NBCardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-nb-black mb-1">
                {rayon.name}
              </h3>
              <NBBadge variant="primary" size="sm">
                {rayon.code}
              </NBBadge>
            </div>
          </div>
        </NBCardHeader>

        <NBCardContent>
          {rayon.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {rayon.description}
            </p>
          )}

          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="border-3 border-black p-3 bg-blue-50">
                <div className="text-2xl font-bold text-nb-primary">
                  {stats.total_areas}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Jumlah Area
                </div>
              </div>

              <div className="border-3 border-black p-3 bg-green-50">
                <div className="text-2xl font-bold text-nb-success">
                  {stats.total_workers}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Total Pekerja
                </div>
              </div>

              <div className="border-3 border-black p-3 bg-purple-50 col-span-2">
                <div className="text-lg font-bold text-nb-black">
                  {formatArea(stats.total_coverage_area || 0)}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Luas Tutupan Total
                </div>
              </div>
            </div>
          )}

          {!stats && (
            <div className="text-sm text-gray-500 italic">
              Statistik tidak tersedia
            </div>
          )}
        </NBCardContent>

        <NBCardFooter>
          <div className="flex items-center text-nb-primary text-sm font-semibold">
            Lihat Detail
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </NBCardFooter>
      </NBCard>
    </Link>
  );
}
