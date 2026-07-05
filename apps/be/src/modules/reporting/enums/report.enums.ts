/**
 * Report Type Enum
 *
 * Defines the 6 supported report types per Phase 5 reporting spec.
 */
export enum ReportType {
  DAILY_OPERATIONS = 'daily_operations',
  WEEKLY_PERFORMANCE = 'weekly_performance',
  MONTHLY_SUMMARY = 'monthly_summary',
  WORKER_PERFORMANCE = 'worker_performance',
  AREA_STATUS = 'area_status',
  OVERTIME_UTILIZATION = 'overtime_utilization',
}

/**
 * Report Format Enum
 *
 * Supported output formats for report generation.
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

/**
 * Report Generation Status Enum
 *
 * Tracks the lifecycle of a generated report.
 */
export enum GeneratedReportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
