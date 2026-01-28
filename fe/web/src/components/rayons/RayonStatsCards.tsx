/**
 * RayonStatsCards Component
 * Display detailed statistics for a rayon in card format
 */

'use client';

import { RayonStats } from '@/types/models';
import { NBCard } from '@/components/nb';
import { formatArea } from '@/lib/utils/geo';

interface RayonStatsCardsProps {
  stats?: RayonStats;
  loading?: boolean;
}

export default function RayonStatsCards({ stats, loading }: RayonStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <NBCard key={i} variant="elevated">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </NBCard>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        Statistik tidak tersedia
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Area',
      value: stats.total_areas,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      label: 'Total Pekerja',
      value: stats.total_workers,
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Pekerja Aktif',
      value: stats.active_workers,
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Luas Tutupan',
      value: formatArea(stats.total_coverage_area || 0),
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-nb-primary' },
    green: { bg: 'bg-green-50', text: 'text-nb-success' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-50', text: 'text-nb-warning' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const colors = colorClasses[card.color];
        return (
          <NBCard key={index} variant="elevated">
            <div className={`p-4 ${colors.bg} border-3 border-black`}>
              <div className="flex items-center justify-between mb-2">
                <div className={colors.text}>{card.icon}</div>
              </div>
              <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                {card.value}
              </div>
              <div className="text-sm font-medium text-gray-600">
                {card.label}
              </div>
            </div>
          </NBCard>
        );
      })}
    </div>
  );
}
