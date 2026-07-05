'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

export interface WorkerRankingChartProps {
  data: Array<{ name: string; score: number }>;
  title?: string;
  loading?: boolean;
}

export function WorkerRankingChart({
  data,
  title,
  loading = false,
}: WorkerRankingChartProps) {
  const { t } = useTranslation();
  const displayTitle = title ?? t('analytics:chartDefaults.workerRanking');
  if (loading || !data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-nb-h3 font-semibold mb-4">{displayTitle}</h3>
        <div className="h-64 bg-nb-gray-50 rounded-nb-base flex items-center justify-center text-nb-gray-600">
          {loading ? t('common:actions.loading') : t('common:empty.noData.title')}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-nb-h3 font-semibold mb-4">{displayTitle}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-nb-gray-200)" />
          <XAxis type="number" stroke="var(--color-nb-gray-600)" domain={[0, 100]} />
          <YAxis dataKey="name" type="category" stroke="var(--color-nb-gray-600)" width={90} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-nb-white)',
              border: '2px solid var(--color-nb-black)',
              borderRadius: '6px',
            }}
          />
          <Bar
            dataKey="score"
            fill="var(--color-nb-primary)"
            radius={[0, 6, 6, 0]}
            name="Skor"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
