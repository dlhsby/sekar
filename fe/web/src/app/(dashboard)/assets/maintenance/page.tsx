'use client';

import { useState, useMemo } from 'react';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionCard,
  Skeleton,
  StatusPill,
} from '@/components/ui';
import {
  useMaintenanceCalendar,
  useOverdueMaintenance,
  type MaintenanceType,
  type MaintenanceStatus,
} from '@/lib/api/assets';
import { formatTime } from '@/lib/utils/formatters';
import type { AssetMaintenance } from '@/lib/api/assets';

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  routine: 'Rutin',
  repair: 'Perbaikan',
  inspection: 'Inspeksi',
  replacement: 'Penggantian',
};

export default function MaintenanceCalendarPage() {
  const { t } = useTranslation();
  const maintenanceStatusLabels = {
    scheduled: t('assets:detail.maintenanceStatus.scheduled'),
    in_progress: t('assets:detail.maintenanceStatus.in_progress'),
    completed: t('assets:detail.maintenanceStatus.completed'),
    cancelled: t('assets:detail.maintenanceStatus.cancelled'),
    overdue: t('assets:detail.maintenanceStatus.overdue'),
  };
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const { data: calendarData = [], isLoading: calendarLoading } = useMaintenanceCalendar(
    currentMonth + 1,
    currentYear
  );
  const { data: overdueData = [], isLoading: overdueLoading } = useOverdueMaintenance();

  const maintenanceByDate = useMemo(() => {
    const map = new Map<string, AssetMaintenance[]>();
    for (const m of calendarData) {
      const date = new Date(m.scheduled_at).toISOString().split('T')[0];
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(m);
    }
    return map;
  }, [calendarData]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(intlLocale(), {
    month: 'long',
    year: 'numeric',
  });

  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('assets:maintenance2.pageTitle')}
        description={t('assets:maintenance2.pageDescription')}
      />

      <Card variant="default">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-nb-h2 font-bold capitalize">{monthName}</h2>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-bold text-nb-body-sm p-2">
                {day}
              </div>
            ))}
          </div>

          {calendarLoading ? (
            <Skeleton variant="card" className="h-64" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dateKey = day
                  ? new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
                  : null;
                const hasMaintenances = dateKey && maintenanceByDate.has(dateKey);
                const count = hasMaintenances ? maintenanceByDate.get(dateKey)!.length : 0;

                return (
                  <div
                    key={idx}
                    className={`
                      border-2 border-nb-black p-2 h-20 flex flex-col text-nb-body-sm
                      ${!day ? 'bg-nb-gray-100' : 'bg-white'}
                    `}
                  >
                    {day && <span className="font-bold">{day}</span>}
                    {hasMaintenances && (
                      <div className="mt-1">
                        <span className="inline-block bg-nb-warning text-white px-1 rounded-sm text-xs">
                          ●{count}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <SectionCard title={t('assets:maintenance2.upcoming')}>
        {calendarLoading ? (
          <div className="p-4">{t('common:actions.loading')}</div>
        ) : !calendarData.filter((m) => m.status === 'scheduled').length ? (
          <EmptyState variant="noData" />
        ) : (
          <div className="p-4 space-y-2">
            {calendarData.filter((m) => m.status === 'scheduled').map((m) => (
              <div key={m.id} className="flex justify-between border-b pb-2">
                <div>
                  <p className="font-semibold">{m.asset?.asset_code}</p>
                  <p className="text-sm text-gray-600">{formatTime(m.scheduled_at)}</p>
                </div>
                <StatusPill tone="warn">
                  {MAINTENANCE_TYPE_LABELS[m.maintenance_type]}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {overdueData.length > 0 && (
        <SectionCard title={t('assets:maintenance2.overdue')}>
          {overdueLoading ? (
            <div className="p-4">{t('common:actions.loading')}</div>
          ) : (
            <div className="p-4 space-y-2">
              {overdueData.map((m) => (
                <div key={m.id} className="flex justify-between border-b pb-2">
                  <div>
                    <p className="font-semibold">{m.asset?.asset_code}</p>
                    <p className="text-sm text-gray-600">{formatTime(m.scheduled_at)}</p>
                  </div>
                  <StatusPill tone="bad">
                    {maintenanceStatusLabels[m.status]}
                  </StatusPill>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
