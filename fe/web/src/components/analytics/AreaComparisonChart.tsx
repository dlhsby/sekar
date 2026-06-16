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
import { Card } from '@/components/ui';

export interface AreaComparisonChartProps {
  data: Array<{ area: string; staffing: number; tasks: number }>;
  title?: string;
  loading?: boolean;
}

export function AreaComparisonChart({
  data,
  title = 'Perbandingan Area',
  loading = false,
}: AreaComparisonChartProps) {
  if (loading || !data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-nb-h3 font-semibold mb-4">{title}</h3>
        <div className="h-64 bg-nb-gray-50 rounded-nb-base flex items-center justify-center text-nb-gray-600">
          {loading ? 'Memuat...' : 'Tidak ada data'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-nb-h3 font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-nb-gray-200)" />
          <XAxis dataKey="area" stroke="var(--color-nb-gray-600)" />
          <YAxis stroke="var(--color-nb-gray-600)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-nb-white)',
              border: '2px solid var(--color-nb-black)',
              borderRadius: '6px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          <Bar dataKey="staffing" fill="var(--color-nb-primary)" name="Staffing (%)" />
          <Bar dataKey="tasks" fill="var(--color-nb-info)" name="Tugas" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
