'use client';

import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useDistricts } from '@/lib/api/districts';
import type { ScheduleOccurrence, ScheduleEvent } from '@/lib/api/schedule-events';

interface ScheduleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: ScheduleOccurrence | null;
  /** The rule behind the occurrence (for recurrence/members); may be loading. */
  event?: ScheduleEvent | null;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  localeCode: string;
}

/** Shift accent by the trailing shift number. */
function shiftAccent(name: string | undefined): string {
  const n = parseInt(name?.match(/\d+/)?.[0] ?? '1', 10);
  return n === 2 ? 'bg-nb-warning' : n === 3 ? 'bg-nb-info' : 'bg-nb-primary';
}

/**
 * Read-only detail of a schedule occurrence (Google-Calendar style): clicking a
 * schedule shows this first — Ubah/Hapus route onward. The scope prompt is no
 * longer shown on click.
 */
export function ScheduleDetailModal({
  open,
  onOpenChange,
  occurrence,
  event,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  localeCode,
}: ScheduleDetailModalProps) {
  const { t } = useTranslation(['schedules', 'roles', 'status', 'common']);
  // Resolves an existing schedule's district id -> name, so it must still find a
  // deactivated district or the name silently blanks.
  const { data: districts = [] } = useDistricts(true);
  if (!occurrence) return null;

  const isTeam = occurrence.team_category != null;
  const title = isTeam
    ? (event?.title ?? occurrence.team_category!.name)
    : occurrence.user.full_name;
  const subtitle = isTeam
    ? `${t('schedules:board.team')} · ${occurrence.team_category!.name}`
    : t(`roles:${occurrence.user.role}`, occurrence.user.role as string);

  const shift = occurrence.shift_definition;
  const shiftLine = shift
    ? `${shift.name} · ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`
    : '—';

  const districtName = occurrence.district_id
    ? (districts.find((r) => r.id === occurrence.district_id)?.name ?? '')
    : '';
  const placement = occurrence.location
    ? `${t('schedules:filters.locationLabel')} · ${occurrence.location.name}`
    : occurrence.region
      ? `${t('schedules:filters.regionLabel')} · ${occurrence.region.name}`
      : occurrence.district_id
        ? `${t('schedules:filters.districtLabel')} · ${districtName}`
        : '—';

  const recurrence = (() => {
    if (!event) return null;
    const p = 'schedules:calendar.event.';
    switch (event.recurrence_type) {
      case 'daily':
        return t(`${p}recurrenceDaily`);
      case 'every_n_days':
        return t(`${p}recurrenceEveryNDays`, { n: event.recurrence_config?.interval_n ?? 2 });
      case 'weekly':
        return t(`${p}recurrenceWeekly`);
      case 'specific_dates':
        return t(`${p}recurrenceSpecificDates`);
      default:
        return t(`${p}recurrenceNone`);
    }
  })();
  const endDate =
    event?.end_date != null
      ? new Date(`${event.end_date}T00:00:00`).toLocaleDateString(localeCode, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

  const statusLabel = t(`status:${occurrence.status}`, occurrence.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className={`h-2 w-full ${shiftAccent(shift?.name)}`} />
        <DialogHeader className="px-6 pt-4">
          <DialogTitle>{title}</DialogTitle>
          <p className="text-nb-body-sm text-nb-gray-500">{subtitle}</p>
        </DialogHeader>
        <DialogBody className="px-6">
          <dl className="grid gap-3">
            <Row k={t('schedules:filters.shiftLabel')} v={shiftLine} />
            <Row k={t('schedules:detail.placement')} v={placement} />
            {recurrence && <Row k={t('schedules:calendar.event.recurrenceLabel')} v={recurrence} />}
            {endDate && <Row k={t('schedules:detail.endDate')} v={endDate} />}
            {isTeam && event?.pic_user?.full_name && (
              <Row k={t('schedules:detail.pic')} v={event.pic_user.full_name} />
            )}
            {isTeam && event?.members && (
              <Row
                k={t('schedules:detail.members')}
                v={t('schedules:board.petugasCount', { count: event.members.length })}
              />
            )}
            <Row
              k={t('schedules:detail.status')}
              v={
                <span className="inline-flex items-center rounded-full border-2 border-nb-black bg-nb-gray-50 px-2 py-0.5 text-nb-caption font-bold">
                  {statusLabel}
                </span>
              }
            />
            {occurrence.is_projected && (
              <p className="text-nb-caption text-nb-gray-500">
                {t('schedules:calendar.projectedHint')}
              </p>
            )}
          </dl>
        </DialogBody>
        <DialogFooter className="px-6 pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.close')}
          </Button>
          {canDelete && (
            <Button variant="destructive" onClick={onDelete}>
              {t('common:actions.delete')}
            </Button>
          )}
          {canEdit && <Button onClick={onEdit}>{t('common:actions.edit')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-nb-body-sm">
      <dt className="w-24 shrink-0 font-bold uppercase tracking-wide text-nb-gray-500 text-nb-caption">
        {k}
      </dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
