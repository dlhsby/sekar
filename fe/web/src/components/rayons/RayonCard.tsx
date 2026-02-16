/**
 * RayonCard Component
 * Displays rayon information with statistics in Neo Brutalism style
 */

'use client';

import Link from 'next/link';
import { Rayon, RayonStats } from '@/types/models';
import { Card, CardHeader, CardContent, CardFooter, Badge } from '@/components/ui';
import { formatArea } from '@/lib/utils/geo';
import { ChevronRight } from 'lucide-react';

interface RayonCardProps {
  rayon: Rayon;
  stats?: RayonStats;
  loading?: boolean;
}

export default function RayonCard({ rayon, stats, loading }: RayonCardProps) {
  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="animate-pulse">
            <div className="h-6 bg-nb-gray-200 w-3/4 mb-2"></div>
            <div className="h-4 bg-nb-gray-200 w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-nb-gray-200 w-full"></div>
              <div className="h-4 bg-nb-gray-200 w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={`/rayons/${rayon.id}`}>
      <Card variant="elevated" interactive className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-nb-black mb-1">{rayon.name}</h3>
              <Badge variant="default" size="sm">
                {rayon.code}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {rayon.description && (
            <p className="text-nb-gray-600 text-sm mb-4 line-clamp-2">{rayon.description}</p>
          )}

          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="border-2 border-nb-black p-3 bg-nb-primary/10 rounded-nb-base">
                <div className="text-2xl font-bold text-nb-primary">{stats.total_areas}</div>
                <div className="text-xs font-medium text-nb-gray-600 mt-1">Jumlah Area</div>
              </div>

              <div className="border-2 border-nb-black p-3 bg-nb-success/10 rounded-nb-base">
                <div className="text-2xl font-bold text-nb-success">{stats.total_users}</div>
                <div className="text-xs font-medium text-nb-gray-600 mt-1">Total Petugas</div>
              </div>

              <div className="border-2 border-nb-black p-3 bg-nb-gray-100 rounded-nb-base col-span-2">
                <div className="text-lg font-bold text-nb-black">
                  {formatArea(stats.total_coverage_area || 0)}
                </div>
                <div className="text-xs font-medium text-nb-gray-600 mt-1">Luas Tutupan Total</div>
              </div>
            </div>
          )}

          {!stats && (
            <div className="text-sm text-nb-gray-500 italic">Statistik tidak tersedia</div>
          )}
        </CardContent>

        <CardFooter>
          <div className="flex items-center text-nb-primary text-sm font-semibold">
            Lihat Detail
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
