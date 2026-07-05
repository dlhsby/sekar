import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('pruningSubmit');
}

export default function PruningSubmitLayout({ children }: { children: ReactNode }) {
  return children;
}
