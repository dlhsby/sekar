/**
 * Report Slice Tests
 * Unit tests for work reports state management
 */

import reportReducer, {
  setLoading,
  setSubmitting,
  setReports,
  addReport,
  updateReport,
  setError,
  clearError,
  clearReports,
} from '../reportSlice';

describe('reportSlice', () => {
  const initialState = {
    reports: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
  };

  const mockReport = {
    id: 1,
    shift_id: 1,
    notes: 'Test report',
    condition: 'good' as const,
    gps_lat: -7.25,
    gps_lng: 112.75,
    report_time: '2026-01-19T10:00:00Z',
    media: [],
  };

  const mockReports = [
    mockReport,
    {
      id: 2,
      shift_id: 1,
      notes: 'Second report',
      condition: 'needs_attention' as const,
      gps_lat: -7.251,
      gps_lng: 112.751,
      report_time: '2026-01-19T11:00:00Z',
      media: [],
    },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(reportReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = reportReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = reportReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting to true', () => {
      const state = reportReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);
    });

    it('should set submitting to false', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = reportReducer(submittingState, setSubmitting(false));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setReports', () => {
    it('should set reports array', () => {
      const state = reportReducer(initialState, setReports(mockReports));

      expect(state.reports).toEqual(mockReports);
      expect(state.reports).toHaveLength(2);
    });

    it('should clear loading when setting reports', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = reportReducer(loadingState, setReports(mockReports));

      expect(state.isLoading).toBe(false);
    });

    it('should clear error when setting reports', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = reportReducer(errorState, setReports(mockReports));

      expect(state.error).toBeNull();
    });

    it('should handle empty reports array', () => {
      const state = reportReducer(initialState, setReports([]));

      expect(state.reports).toEqual([]);
    });

    it('should replace existing reports', () => {
      const stateWithReports = { ...initialState, reports: mockReports };
      const newReports = [{ ...mockReport, id: 99, notes: 'New report' }];
      const state = reportReducer(stateWithReports, setReports(newReports));

      expect(state.reports).toEqual(newReports);
      expect(state.reports).toHaveLength(1);
    });
  });

  describe('addReport', () => {
    it('should add report to beginning of array', () => {
      const stateWithReports = { ...initialState, reports: [mockReports[1]] };
      const state = reportReducer(stateWithReports, addReport(mockReport));

      expect(state.reports[0]).toEqual(mockReport);
      expect(state.reports).toHaveLength(2);
    });

    it('should clear submitting when adding report', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = reportReducer(submittingState, addReport(mockReport));

      expect(state.isSubmitting).toBe(false);
    });

    it('should clear error when adding report', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = reportReducer(errorState, addReport(mockReport));

      expect(state.error).toBeNull();
    });

    it('should add to empty reports array', () => {
      const state = reportReducer(initialState, addReport(mockReport));

      expect(state.reports).toEqual([mockReport]);
    });
  });

  describe('updateReport', () => {
    it('should update existing report', () => {
      const stateWithReports = { ...initialState, reports: mockReports };
      const updatedReport = { ...mockReport, notes: 'Updated notes' };
      const state = reportReducer(stateWithReports, updateReport(updatedReport));

      expect(state.reports[0].notes).toBe('Updated notes');
    });

    it('should not modify other reports', () => {
      const stateWithReports = { ...initialState, reports: mockReports };
      const updatedReport = { ...mockReport, notes: 'Updated notes' };
      const state = reportReducer(stateWithReports, updateReport(updatedReport));

      expect(state.reports[1]).toEqual(mockReports[1]);
    });

    it('should not add report if id not found', () => {
      const stateWithReports = { ...initialState, reports: mockReports };
      const unknownReport = { ...mockReport, id: 999 };
      const state = reportReducer(stateWithReports, updateReport(unknownReport));

      expect(state.reports).toHaveLength(2);
      expect(state.reports.find(r => r.id === 999)).toBeUndefined();
    });

    it('should handle updating in empty array', () => {
      const state = reportReducer(initialState, updateReport(mockReport));

      expect(state.reports).toEqual([]);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = reportReducer(initialState, setError('Failed to load'));

      expect(state.error).toBe('Failed to load');
    });

    it('should clear loading when setting error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = reportReducer(loadingState, setError('Error'));

      expect(state.isLoading).toBe(false);
    });

    it('should clear submitting when setting error', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = reportReducer(submittingState, setError('Error'));

      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = reportReducer(errorState, clearError());

      expect(state.error).toBeNull();
    });

    it('should not affect reports', () => {
      const stateWithReportsAndError = {
        ...initialState,
        reports: mockReports,
        error: 'Error',
      };
      const state = reportReducer(stateWithReportsAndError, clearError());

      expect(state.reports).toEqual(mockReports);
    });
  });

  describe('clearReports', () => {
    it('should clear all reports', () => {
      const stateWithReports = { ...initialState, reports: mockReports };
      const state = reportReducer(stateWithReports, clearReports());

      expect(state.reports).toEqual([]);
    });

    it('should not affect loading state', () => {
      const loadingStateWithReports = {
        ...initialState,
        reports: mockReports,
        isLoading: true,
      };
      const state = reportReducer(loadingStateWithReports, clearReports());

      expect(state.isLoading).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should handle full fetch flow', () => {
      // Start loading
      let state = reportReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      // Set reports
      state = reportReducer(state, setReports(mockReports));
      expect(state.reports).toEqual(mockReports);
      expect(state.isLoading).toBe(false);
    });

    it('should handle submit flow', () => {
      // Start submitting
      let state = reportReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);

      // Add report on success
      state = reportReducer(state, addReport(mockReport));
      expect(state.reports).toContainEqual(mockReport);
      expect(state.isSubmitting).toBe(false);
    });

    it('should handle error flow', () => {
      // Start loading
      let state = reportReducer(initialState, setLoading(true));

      // Error occurs
      state = reportReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      // Clear error
      state = reportReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });
});
