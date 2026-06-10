import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitoring Real-Time · SEKAR',
  description: 'Monitor lokasi real-time dan status satgas RTH di lapangan',
};

export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return children;
}
