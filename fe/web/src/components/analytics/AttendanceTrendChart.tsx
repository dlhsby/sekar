'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui';

export interface AttendanceTrendChartProps {
  data: Array<{ date: string; value: number }>;
  title?: string;
  loading?: boolean;
}

export function AttendanceTrendChart({
  data,
  title = 'Tren Kehadiran',
  loading = false,
}: AttendanceTrendChartProps) {
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
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-nb-gray-200)" />
          <XAxis dataKey="date" stroke="var(--color-nb-gray-600)" />
          <YAxis stroke="var(--color-nb-gray-600)" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-nb-white)',
              border: '2px solid var(--color-nb-black)',
              borderRadius: '6px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-nb-primary)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-nb-primary)', r: 4 }}
            activeDot={{ r: 6 }}
            name="Kehadiran (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
