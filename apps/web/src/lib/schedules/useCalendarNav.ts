'use client';

/**
 * The date-nav label and its step, for one calendar range.
 *
 * "Sabtu, 1 Agustus 2026" for a day, a week's two ends, a month, a year — and
 * the matching add/subtract when the arrows are pressed. Pulled out of
 * `schedules/page.tsx`: it is presentation of the anchor date, independent of
 * everything else the page holds.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, addMonths, addWeeks, addYears, endOfWeek, startOfWeek } from 'date-fns';

export type CalendarView = 'year' | 'month' | 'week' | 'day';

export function useCalendarNav(
  calendarView: CalendarView,
  anchor: Date,
  setAnchor: (fn: (d: Date) => Date) => void,
) {
  const { i18n } = useTranslation();
  const localeCode = i18n.language === 'en' ? 'en-US' : 'id-ID';

  // Compact date-nav label + step, driven by the current range.
  const dateLabel = useMemo(() => {
    if (calendarView === 'year') return String(anchor.getFullYear());
    if (calendarView === 'month')
      return anchor.toLocaleDateString(localeCode, { month: 'long', year: 'numeric' });
    if (calendarView === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      const we = endOfWeek(anchor, { weekStartsOn: 1 });
      const f = (d: Date) => d.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' });
      return `${f(ws)} – ${f(we)} ${we.getFullYear()}`;
    }
    return anchor.toLocaleDateString(localeCode, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [calendarView, anchor, localeCode]);

  const navStep = (dir: 1 | -1) =>
    setAnchor((d) =>
      calendarView === 'year'
        ? addYears(d, dir)
        : calendarView === 'month'
          ? addMonths(d, dir)
          : calendarView === 'week'
            ? addWeeks(d, dir)
            : addDays(d, dir)
    );

  return { dateLabel, navStep, localeCode };
}
