'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

export interface TaskCompletionChartProps {
  data: Array<{ date: string; completed: number; total: number }>;
  title?: string;
  loading?: boolean;
}

export function TaskCompletionChart({
  data,
  title,
  loading = false,
}: TaskCompletionChartProps) {
  const { t } = useTranslation();
  const displayTitle = title ?? t('analytics:chartDefaults.taskCompletion');
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
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-nb-gray-200)" />
          <XAxis dataKey="date" stroke="var(--color-nb-gray-600)" />
          <YAxis stroke="var(--color-nb-gray-600)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-nb-white)',
              border: '2px solid var(--color-nb-black)',
              borderRadius: '6px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          <Bar dataKey="completed" fill="var(--color-nb-success)" name="Diselesaikan" />
          <Bar dataKey="total" fill="var(--color-nb-gray-300)" name="Total" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
