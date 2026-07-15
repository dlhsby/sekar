'use client';

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface DateNavProps {
  /** Contextual period label (day / week / month / year). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/**
 * Compact Google-Calendar-style date navigation: Today · ‹ › · label. Lives in
 * the toolbar row (no big bordered bar) so all controls share one line.
 */
export function DateNav({ label, onPrev, onNext, onToday }: DateNavProps) {
  const { t } = useTranslation(['schedules']);
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={onToday}>
        {t('schedules:calendar.navigation.today')}
      </Button>
      <button
        type="button"
        onClick={onPrev}
        aria-label={t('schedules:calendar.navigation.prev')}
        className="grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={t('schedules:calendar.navigation.next')}
        className="grid size-8 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
      >
        <ChevronRight className="size-4" />
      </button>
      <span className="ml-1 whitespace-nowrap text-nb-body font-bold">{label}</span>
    </div>
  );
}
