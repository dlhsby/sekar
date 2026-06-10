import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Permohonan Pemotongan · SEKAR',
  description: 'Kelola permohonan pemotongan pohon dari kecamatan',
};

export default function PruningRequestsLayout({ children }: { children: ReactNode }) {
  return children;
}
