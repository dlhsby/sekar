import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Tugas · SEKAR',
  description: 'Lihat dan kelola tugas pekerjaan satgas RTH',
};

export default function TasksLayout({ children }: { children: ReactNode }) {
  return children;
}
