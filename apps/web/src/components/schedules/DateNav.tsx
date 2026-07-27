'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { cn, nbFocusRing } from '@/lib/utils/cn';

interface DateNavProps {
  /** Contextual period label (day / week / month / year). */
  label: string;
  /** The anchor date the label describes, as ISO `yyyy-MM-dd`. */
  value: string;
  /** Jump to an arbitrary date (ISO `yyyy-MM-dd`). */
  onValueChange: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Parse an ISO `yyyy-MM-dd` as a LOCAL date (bare `new Date(iso)` is UTC). */
function parseIsoLocal(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Compact Google-Calendar-style date navigation: Hari Ini · ‹ label › .
 *
 * The label sits BETWEEN the arrows — where the eye already is when stepping
 * through days — and is itself the picker trigger. Jumping three weeks out used
 * to mean 21 clicks on ›.
 *
 * It stays a contextual LABEL rather than a dd/mm/yyyy field because it has to
 * read for four view sizes ("Senin, 27 Juli 2026" · a week range · "Juli 2026" ·
 * "2026"); picking any day resolves to the period containing it.
 */
export function DateNav({ label, value, onValueChange, onPrev, onNext, onToday }: DateNavProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const [open, setOpen] = useState(false);
  const selected = parseIsoLocal(value);

  // Matches Button size="sm" (h-10) so the arrows, Hari Ini and the date
  // trigger all sit on one line at one height — they were h-8 against h-10.
  const arrow =
    'grid size-10 shrink-0 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50';

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        {t('schedules:calendar.navigation.today')}
      </Button>
      <button
        type="button"
        onClick={onPrev}
        aria-label={t('schedules:calendar.navigation.prev')}
        className={arrow}
      >
        <ChevronLeft className="size-4" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={t('schedules:calendar.navigation.pickDate')}
            // min-w keeps the arrows from shuffling sideways as the label's
            // width changes between views — and between days of the week.
            className={cn('min-w-[13rem] whitespace-nowrap font-bold', nbFocusRing)}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-0">
          <Calendar
            mode="single"
            defaultMonth={selected}
            selected={selected}
            onSelect={(d) => {
              if (d) onValueChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }}
            locale={dateFnsLocale()}
          />
          <div className="border-t-2 border-nb-black p-1.5">
            <button
              type="button"
              onClick={() => {
                onToday();
                setOpen(false);
              }}
              className="w-full rounded-nb-base px-2 py-1.5 text-nb-body-sm font-semibold text-nb-success-dark hover:bg-nb-gray-100"
            >
              {t('common:pickers.today')}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={onNext}
        aria-label={t('schedules:calendar.navigation.next')}
        className={arrow}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
