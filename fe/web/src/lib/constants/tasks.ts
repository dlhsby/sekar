/**
 * Task Constants for SEKAR Web Application
 * 8-status system with verification workflow
 */

import type { TaskStatus } from '@/lib/api/tasks';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Ditugaskan',
  accepted: 'Diterima',
  declined: 'Ditolak',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  verified: 'Terverifikasi',
  revision_needed: 'Perlu Revisi',
};

export const TASK_STATUS_BADGES: Record<
  TaskStatus,
  'secondary' | 'default' | 'success' | 'warning' | 'destructive'
> = {
  pending: 'secondary',
  assigned: 'default',
  accepted: 'default',
  declined: 'destructive',
  in_progress: 'warning',
  completed: 'success',
  verified: 'success',
  revision_needed: 'destructive',
};
