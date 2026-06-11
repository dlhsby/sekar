import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kapasitas Layanan · SEKAR',
  description: 'Kalender kapasitas layanan mingguan per rayon di SEKAR',
};

export default function CapacityLayout({ children }: { children: ReactNode }) {
  return children;
}
