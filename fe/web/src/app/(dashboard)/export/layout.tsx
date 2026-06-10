import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Export Data · SEKAR',
  description: 'Export data dari SEKAR dalam format CSV atau XLSX',
};

export default function ExportLayout({ children }: { children: ReactNode }) {
  return children;
}
