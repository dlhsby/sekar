import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lembur · SEKAR',
  description: 'Kelola dan setujui permintaan lembur satgas RTH',
};

export default function OvertimeLayout({ children }: { children: ReactNode }) {
  return children;
}
