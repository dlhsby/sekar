'use client';

import * as React from 'react';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils/cn';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar — react-day-picker styled with Neo Brutalism tokens. Indonesian
 * month/day names; today shows a ring, the selected day a solid sage fill with
 * a 2px black border.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps): React.JSX.Element {
  return (
    <DayPicker
      locale={dateFnsLocale()}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-3',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-nb-body-sm font-semibold text-nb-black capitalize',
        nav: 'absolute inset-x-2 top-3 flex items-center justify-between',
        button_previous:
          'inline-flex h-8 w-8 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-xs hover:bg-nb-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        button_next:
          'inline-flex h-8 w-8 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-xs hover:bg-nb-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-nb-caption font-bold uppercase text-nb-gray-500',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 p-0 text-center text-nb-body-sm',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-nb-base text-nb-black hover:bg-nb-gray-100 aria-selected:border-2 aria-selected:border-nb-black aria-selected:bg-nb-primary aria-selected:font-bold aria-selected:text-nb-ink',
        // Quiet orientation marker only — the *selected* day owns the strong fill.
        today: 'font-bold text-nb-success-dark',
        selected: 'rounded-nb-base',
        outside: 'text-nb-gray-400 opacity-60',
        disabled: 'text-nb-gray-300 opacity-50',
        hidden: 'invisible',
        range_middle: 'aria-selected:bg-nb-primary/30 aria-selected:text-nb-black aria-selected:border-0',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
