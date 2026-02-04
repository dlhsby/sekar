/**
 * RayonStatsCards Component
 * Display detailed statistics for a rayon in card format
 */

'use client';

import { RayonStats } from '@/types/models';
import { Card, CardContent } from '@/components/ui';
import { formatArea } from '@/lib/utils/geo';
import { Map, Users, UserCheck, Square } from 'lucide-react';

interface RayonStatsCardsProps {
  stats?: RayonStats;
  loading?: boolean;
}

export default function RayonStatsCards({ stats, loading }: RayonStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} variant="elevated">
            <CardContent>
              <div className="animate-pulse">
                <div className="h-8 bg-nb-gray-200 w-1/2 mb-2"></div>
                <div className="h-4 bg-nb-gray-200 w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-nb-gray-500">
        Statistik tidak tersedia
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Area',
      value: stats.total_areas,
      color: 'blue',
      icon: <Map className="w-6 h-6" />,
    },
    {
      label: 'Total Pekerja',
      value: stats.total_workers,
      color: 'green',
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: 'Pekerja Aktif',
      value: stats.active_workers,
      color: 'purple',
      icon: <UserCheck className="w-6 h-6" />,
    },
    {
      label: 'Luas Tutupan',
      value: formatArea(stats.total_coverage_area || 0),
      color: 'orange',
      icon: <Square className="w-6 h-6" />,
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
          <Card key={index} variant="elevated">
            <div className={`p-4 ${colors.bg} border-3 border-nb-black`}>
              <div className="flex items-center justify-between mb-2">
                <div className={colors.text}>{card.icon}</div>
              </div>
              <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                {card.value}
              </div>
              <div className="text-sm font-medium text-nb-gray-600">
                {card.label}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
