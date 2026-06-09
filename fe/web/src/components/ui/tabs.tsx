'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Tabs — segmented control (web mirror of mobile NBTab).
 *
 * Mirrors the hi-fi `.tabs` primitive: bordered segmented control, active
 * segment painted `--primary`. Used by the overtime approval queue, the tasks
 * kanban/table toggle, the notifications category filter, and the settings rail.
 * Controlled: parent owns `value`.
 */

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  count?: number;
}

export interface TabsProps<K extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem<K>[];
  value: K;
  onValueChange: (key: K) => void;
  size?: 'sm' | 'default';
  /** Stretch tabs to fill the available width (equal columns). */
  fullWidth?: boolean;
  'aria-label'?: string;
}

export function Tabs<K extends string = string>({
  tabs,
  value,
  onValueChange,
  size = 'default',
  fullWidth = false,
  className,
  ...props
}: TabsProps<K>) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else return;
    e.preventDefault();
    onValueChange(tabs[next].key);
  };

  return (
    <div
      role="tablist"
      aria-label={props['aria-label']}
      className={cn(
        'inline-flex overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white',
        fullWidth && 'flex w-full',
        className
      )}
      {...props}
    >
      {tabs.map((tab, i) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-heading font-bold transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:-outline-offset-2',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-[12.5px]',
              i > 0 && 'border-l-2 border-nb-black',
              fullWidth && 'flex-1',
              active ? 'bg-nb-primary text-nb-black' : 'bg-nb-white text-nb-gray-600 hover:bg-nb-gray-50'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 font-mono text-[10px] leading-tight',
                  active ? 'bg-nb-black text-nb-primary' : 'bg-nb-gray-100 text-nb-gray-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
