/**
 * Analytics Types
 * Types mirroring backend analytics DTOs
 */

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Worker performance analytics
 * Mirrors: apps/be/src/modules/analytics/dto/worker-analytics.dto.ts
 */
export interface WorkerAnalytics {
  id: string;
  full_name: string;
  date: string;
  attended: number; // days attended
  late_minutes: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  total_activities: number;
  approved_activities: number;
  activity_submission_rate: number;
  activity_approval_rate: number;
  within_area_pings: number;
  total_pings: number;
  area_compliance: number;
  overtime_hours: number;
  performance_score: number;
  grade: Grade;
  last_updated?: string;
}

/**
 * Area analytics summary
 * Mirrors: apps/be/src/modules/analytics/dto/area-analytics.dto.ts
 */
export interface AreaAnalytics {
  id: string;
  area_name: string;
  date: string;
  attended_workers: number;
  required_workers: number;
  staffing_coverage: number;
  open_tasks: number;
  maintenance_count: number;
  incident_rate: number;
  avg_worker_performance: number;
  last_updated?: string;
}

/**
 * Today metrics snapshot
 * Mirrors: apps/be/src/modules/analytics/dto/dashboard-summary.dto.ts
 */
export interface TodayMetrics {
  attendanceRate: number;
  activeWorkers: number;
  tasksCompleted: number;
  activitiesSubmitted: number;
  openTasks: number;
  overtimeHours: number;
}

/**
 * 7-day trend metrics
 */
export interface TrendMetrics {
  attendance: number[];
  taskCompletion: number[];
  activities: number[];
}

/**
 * Alert item (understaffed areas)
 */
export interface AlertItem {
  areaId: string;
  areaName: string;
  deficit: number;
}

/**
 * Dashboard alerts
 */
export interface Alerts {
  understaffedAreas: AlertItem[];
  overdueMaintenances: number;
  missingWorkers: number;
  overdueTasks: number;
}

/**
 * Dashboard summary
 * Mirrors: apps/be/src/modules/analytics/dto/dashboard-summary.dto.ts
 */
export interface DashboardSummary {
  today: TodayMetrics;
  trends: TrendMetrics;
  alerts: Alerts;
}

/**
 * Paginated workers list response
 */
export interface WorkersListResponse {
  data: WorkerAnalytics[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Operational analytics
 * Mirrors: apps/be/src/modules/analytics/dto/operational-analytics.dto.ts
 */
export interface OperationalAnalytics {
  date: string;
  system_attendance: number;
  task_throughput: number;
  avg_response_hours: number;
  overtime_ratio: number;
  worker_utilization: number;
  geofence_compliance: number;
  last_updated?: string;
}
