/**
 * Reports Data Types
 * Phase 5-1: Report generation, retrieval, and management
 */

/**
 * Report type enum (mirrors backend)
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
 * Report format enum (mirrors backend)
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

/**
 * Report generation status enum (mirrors backend)
 */
export enum GeneratedReportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Report template from backend
 */
export interface ReportTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  report_type: ReportType;
  template_config: Record<string, any> | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Report parameters for generation
 */
export interface ReportParameters {
  start_date?: string;
  end_date?: string;
  location_id?: string;
  district_id?: string;
  worker_id?: string;
  [key: string]: any;
}

/**
 * Generated report instance
 */
export interface GeneratedReport {
  id: string;
  template_id: string;
  generated_by: string | null;
  schedule_id: string | null;
  title: string;
  report_type: ReportType;
  format: ReportFormat;
  status: GeneratedReportStatus;
  file_url: string | null;
  file_size_bytes: number | null;
  parameters: ReportParameters | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated reports response
 */
export interface ReportsListResponse {
  data: GeneratedReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Generate report request
 */
export interface GenerateReportRequest {
  report_type: ReportType;
  slug?: string;
  format: ReportFormat;
  parameters?: ReportParameters;
}
