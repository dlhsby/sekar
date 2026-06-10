import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aktivitas · SEKAR',
  description: 'Lihat dan setujui laporan aktivitas satgas RTH',
};

export default function ActivitiesLayout({ children }: { children: ReactNode }) {
  return children;
}
