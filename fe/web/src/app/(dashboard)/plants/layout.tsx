import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tanaman · SEKAR',
  description: 'Katalog tanaman dan inventaris per area di SEKAR',
};

export default function PlantsLayout({ children }: { children: ReactNode }) {
  return children;
}
