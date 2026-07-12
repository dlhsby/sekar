'use client';

import { useTranslation } from 'react-i18next';
import { intlLocale } from '@/lib/i18n/date-locale';

/**
 * TaskKanban — read-only board view for TSK-1 (hifi-web §06).
 *
 * Collapses the 8-status workflow into 4 lanes (see TASK_KANBAN_LANES) and
 * renders each task as a compact card. Cards link to the detail page where the
 * actual status transitions happen via the guarded workflow actions — the board
 * is a visualisation, not a drag-to-mutate surface (the 8-status transitions
 * have server-side rules; arbitrary drag would bypass them).
 */

import { useMemo } from 'react';
import Link from 'next/link';

import { StatusPill } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import type { Task } from '@/lib/api/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getKanbanLaneLabel,
  TASK_STATUS_TONES,
  TASK_PRIORITY_TONES,
  TASK_KANBAN_LANES,
} from '@/lib/constants/tasks';

export interface TaskKanbanProps {
  tasks: Task[];
  loading?: boolean;
}

export function TaskKanban({ tasks, loading }: TaskKanbanProps) {
  const { t } = useTranslation();
  const lanes = useMemo(
    () =>
      TASK_KANBAN_LANES.map((lane) => ({
        ...lane,
        items: tasks.filter((task) => lane.statuses.includes(task.status)),
      })),
    [tasks],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {lanes.map((lane) => (
        <section key={lane.key} aria-label={getKanbanLaneLabel(lane.key, t)} className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 font-heading text-[13px] font-bold text-nb-black">
              <span
                className="inline-block size-2.5 rounded-full border-[1.5px] border-nb-black"
                style={statusDotStyle(lane.tone)}
                aria-hidden="true"
              />
              {getKanbanLaneLabel(lane.key, t)}
            </h3>
            <span className="rounded-full bg-nb-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold text-nb-gray-700">
              {lane.items.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="h-24 animate-shimmer rounded-nb-base border-2 border-nb-black bg-nb-gray-300" />
            ) : lane.items.length === 0 ? (
              <p className="rounded-nb-base border-2 border-dashed border-nb-gray-300 px-3 py-6 text-center text-nb-caption text-nb-gray-500">
                {t("tasks:kanban.emptyState")}
              </p>
            ) : (
              lane.items.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { t } = useTranslation();
  const place = task.location?.name ?? task.rayon?.name ?? null;
  const due = task.due_date ? new Date(task.due_date).toLocaleDateString(intlLocale()) : null;

  return (
    // Next.js Link already handles modifier/middle-clicks and keyboard activation;
    // no custom onClick needed.
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        'block rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-xs transition-shadow',
        'hover:shadow-nb-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <StatusPill tone={TASK_PRIORITY_TONES[task.priority]}>
          {getTaskPriorityLabel(task.priority, t)}
        </StatusPill>
        {due && <span className="font-mono text-[10px] text-nb-gray-600">{due}</span>}
      </div>
      <p className="mb-2 line-clamp-2 font-heading text-[13px] font-bold text-nb-black">
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        {place && <span className="truncate font-mono text-[10px] text-nb-gray-600">{place}</span>}
        <StatusPill tone={TASK_STATUS_TONES[task.status]} dot>
          {getTaskStatusLabel(task.status, t)}
        </StatusPill>
      </div>
      {task.assigned_to && (
        <p className="mt-1.5 truncate text-nb-caption text-nb-gray-600">
          {task.assigned_to.full_name}
        </p>
      )}
    </Link>
  );
}

/** Map a pill tone to its dot fill colour using the status token vars. */
function statusDotStyle(tone: string): React.CSSProperties {
  const map: Record<string, string> = {
    neutral: 'var(--color-nb-gray-400)',
    info: 'var(--color-status-outside)',
    warn: 'var(--color-status-idle)',
    active: 'var(--color-status-active)',
    ok: 'var(--color-nb-primary)',
    bad: 'var(--color-status-missing)',
  };
  return { background: map[tone] ?? 'var(--color-nb-gray-400)' };
}
