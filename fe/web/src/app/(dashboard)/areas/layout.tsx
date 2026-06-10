import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Area · SEKAR',
  description: 'Kelola area dan zona kerja di SEKAR',
};

export default function AreasLayout({ children }: { children: ReactNode }) {
  return children;
}
