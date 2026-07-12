'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';

export type ViewType = 'month' | 'week' | 'day' | 'table';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const { t } = useTranslation();

  const views: Array<{ value: ViewType; label: string }> = [
    { value: 'month', label: t('schedules:calendar.views.month') },
    { value: 'week', label: t('schedules:calendar.views.week') },
    { value: 'day', label: t('schedules:calendar.views.day') },
    { value: 'table', label: t('schedules:calendar.views.table') },
  ];

  return (
    <div className="flex gap-2">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={currentView === view.value ? 'default' : 'outline'}
          onClick={() => onViewChange(view.value)}
          className="flex-1"
        >
          {view.label}
        </Button>
      ))}
    </div>
  );
}
