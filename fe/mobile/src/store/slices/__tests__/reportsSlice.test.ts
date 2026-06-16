/**
 * Reports Slice Tests
 * Phase 5-1: Redux state management for reports
 */

import reportsReducer, {
  setSelectedReport,
  setError,
  clearError,
  resetReports,
  fetchTemplates,
  fetchReports,
  fetchReport,
  generateNewReport,
  deleteReportThunk,
  selectReports,
  selectTemplates,
  selectSelectedReport,
  selectReportsError,
} from '../reportsSlice';
import {
  ReportFormat,
  GeneratedReportStatus,
} from '../../../types/reports.types';
import type {
  GeneratedReport,
  ReportTemplate,
  ReportType,
} from '../../../types/reports.types';

// Mock data
const mockTemplate: ReportTemplate = {
  id: 'template-1',
  name: 'Laporan Harian',
  slug: 'daily_operations',
  description: 'Daily operations report',
  report_type: 'daily_operations' as ReportType,
  template_config: {},
  is_system: true,
  created_by: null,
  created_at: '2026-06-16T00:00:00Z',
  updated_at: '2026-06-16T00:00:00Z',
};

const mockReport: GeneratedReport = {
  id: 'report-1',
  template_id: 'template-1',
  generated_by: 'user-1',
  schedule_id: null,
  title: 'Laporan Harian 16 Juni',
  report_type: 'daily_operations' as ReportType,
  format: ReportFormat.PDF,
  status: GeneratedReportStatus.COMPLETED,
  file_url: 'https://example.com/report.pdf',
  file_size_bytes: 1024000,
  parameters: null,
  error_message: null,
  started_at: '2026-06-16T10:00:00Z',
  completed_at: '2026-06-16T10:05:00Z',
  created_at: '2026-06-16T10:00:00Z',
  updated_at: '2026-06-16T10:05:00Z',
};

describe('reportsSlice', () => {
  describe('reducers', () => {
    it('should set selected report', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const newState = reportsReducer(
        initialState,
        setSelectedReport(mockReport)
      );

      expect(newState.selectedReport).toEqual(mockReport);
    });

    it('should clear selected report', () => {
      const initialState = reportsReducer(undefined, setSelectedReport(mockReport));
      const newState = reportsReducer(initialState, setSelectedReport(null));

      expect(newState.selectedReport).toBeNull();
    });

    it('should set error', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const errorMsg = 'Test error';
      const newState = reportsReducer(initialState, setError(errorMsg));

      expect(newState.error).toBe(errorMsg);
      expect(newState.isLoading).toBe(false);
      expect(newState.isSubmitting).toBe(false);
    });

    it('should clear error', () => {
      const initialState = reportsReducer(undefined, setError('Test error'));
      const newState = reportsReducer(initialState, clearError());

      expect(newState.error).toBeNull();
    });

    it('should reset reports', () => {
      let state = reportsReducer(undefined, { type: 'unknown' });
      state = { ...state, reports: [mockReport, mockReport] };

      const newState = reportsReducer(state, resetReports());

      expect(newState.reports).toEqual([]);
      expect(newState.page).toBe(1);
      expect(newState.hasMore).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('async thunks', () => {
    it('should handle fetchTemplates.fulfilled', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const action = {
        type: fetchTemplates.fulfilled.type,
        payload: [mockTemplate],
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.templates).toEqual([mockTemplate]);
      expect(newState.isLoading).toBe(false);
    });

    it('should handle fetchTemplates.pending', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const action = {
        type: fetchTemplates.pending.type,
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.isLoading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('should handle fetchTemplates.rejected', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const errorMsg = 'Failed to fetch templates';
      const action = {
        type: fetchTemplates.rejected.type,
        payload: errorMsg,
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBe(errorMsg);
    });

    it('should handle fetchReports.fulfilled (reset)', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const action = {
        type: fetchReports.fulfilled.type,
        payload: {
          data: [mockReport],
          meta: { total: 1, page: 1, limit: 10, pages: 1 },
        },
        meta: { arg: { reset: true } },
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.reports).toEqual([mockReport]);
      expect(newState.page).toBe(1);
      expect(newState.hasMore).toBe(false);
      expect(newState.isLoading).toBe(false);
    });

    it('should handle fetchReports.fulfilled (pagination)', () => {
      let state = reportsReducer(undefined, { type: 'unknown' });
      state = { ...state, reports: [mockReport] };

      const newReport = { ...mockReport, id: 'report-2' };
      const action = {
        type: fetchReports.fulfilled.type,
        payload: {
          data: [newReport],
          meta: { total: 2, page: 2, limit: 10, pages: 1 },
        },
        meta: { arg: { reset: false } },
      };

      const newState = reportsReducer(state, action);

      expect(newState.reports).toEqual([mockReport, newReport]);
      expect(newState.page).toBe(2);
      expect(newState.hasMore).toBe(false);
    });

    it('should handle generateNewReport.fulfilled', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const newReport = { ...mockReport, id: 'report-2', status: 'processing' as const };
      const action = {
        type: generateNewReport.fulfilled.type,
        payload: newReport,
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.reports[0]).toEqual(newReport);
      expect(newState.selectedReport).toEqual(newReport);
      expect(newState.isSubmitting).toBe(false);
    });

    it('should handle deleteReportThunk.fulfilled', () => {
      let state = reportsReducer(undefined, { type: 'unknown' });
      state = {
        ...state,
        reports: [mockReport, { ...mockReport, id: 'report-2' }],
        selectedReport: mockReport,
      };

      const action = {
        type: deleteReportThunk.fulfilled.type,
        payload: 'report-1',
      };

      const newState = reportsReducer(state, action);

      expect(newState.reports).toEqual([{ ...mockReport, id: 'report-2' }]);
      expect(newState.selectedReport).toBeNull();
      expect(newState.isSubmitting).toBe(false);
    });

    it('should handle fetchReport.fulfilled', () => {
      const initialState = reportsReducer(undefined, { type: 'unknown' });
      const action = {
        type: fetchReport.fulfilled.type,
        payload: mockReport,
      };

      const newState = reportsReducer(initialState, action);

      expect(newState.selectedReport).toEqual(mockReport);
      expect(newState.isLoading).toBe(false);
    });
  });

  describe('selectors', () => {
    it('should select reports', () => {
      const state = {
        reports: {
          reports: [mockReport],
          templates: [],
          selectedReport: null,
          isLoading: false,
          isSubmitting: false,
          isRefreshing: false,
          error: null,
          page: 1,
          limit: 10,
          hasMore: true,
        },
      };

      const result = selectReports(state);
      expect(result).toEqual([mockReport]);
    });

    it('should select templates', () => {
      const state = {
        reports: {
          reports: [],
          templates: [mockTemplate],
          selectedReport: null,
          isLoading: false,
          isSubmitting: false,
          isRefreshing: false,
          error: null,
          page: 1,
          limit: 10,
          hasMore: true,
        },
      };

      const result = selectTemplates(state);
      expect(result).toEqual([mockTemplate]);
    });

    it('should select selected report', () => {
      const state = {
        reports: {
          reports: [],
          templates: [],
          selectedReport: mockReport,
          isLoading: false,
          isSubmitting: false,
          isRefreshing: false,
          error: null,
          page: 1,
          limit: 10,
          hasMore: true,
        },
      };

      const result = selectSelectedReport(state);
      expect(result).toEqual(mockReport);
    });

    it('should select error', () => {
      const state = {
        reports: {
          reports: [],
          templates: [],
          selectedReport: null,
          isLoading: false,
          isSubmitting: false,
          isRefreshing: false,
          error: 'Test error',
          page: 1,
          limit: 10,
          hasMore: true,
        },
      };

      const result = selectReportsError(state);
      expect(result).toBe('Test error');
    });
  });
});
