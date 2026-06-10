import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ajukan Permohonan · SEKAR',
  description: 'Ajukan permohonan pemotongan pohon ke DLH Kota Surabaya',
};

export default function PruningSubmitLayout({ children }: { children: ReactNode }) {
  return children;
}
