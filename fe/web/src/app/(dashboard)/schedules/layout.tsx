import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jadwal · SEKAR',
  description: 'Kelola jadwal shift satgas RTH',
};

export default function SchedulesLayout({ children }: { children: ReactNode }) {
  return children;
}
