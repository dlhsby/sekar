/**
 * Reports API Service
 * Work reports related API calls
 */

import { get, post } from './apiClient';
import apiClient from './apiClient';
import type {
  CreateReportRequest,
  CreateReportResponse,
  UploadMediaResponse,
  MyReportsResponse,
  ApiResponse,
} from '../../types/api.types';

/**
 * Create a work report
 * @param data - Report data with base64 photos
 * @returns Report response with report ID
 */
export async function createReport(
  data: CreateReportRequest,
): Promise<ApiResponse<CreateReportResponse>> {
  return post<CreateReportResponse>('/reports', data);
}

/**
 * Upload media for a report
 * @param reportId - Report ID
 * @param file - File object (photo or video)
 * @param fileType - MIME type
 * @returns Upload response with media URL
 */
export async function uploadMedia(
  reportId: number,
  file: any,
  fileType: string,
): Promise<ApiResponse<UploadMediaResponse>> {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: fileType,
      name: file.fileName || `media_${Date.now()}.${fileType.split('/')[1]}`,
    } as any);

    const response = await apiClient.post<UploadMediaResponse>(
      `/reports/${reportId}/upload-media`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return { data: response.data };
  } catch (error: any) {
    return { error: error.message || 'Upload failed' };
  }
}

/**
 * Get my reports
 * @param date - Date filter (YYYY-MM-DD)
 * @returns List of reports
 */
export async function getMyReports(
  date?: string,
): Promise<ApiResponse<MyReportsResponse[]>> {
  const params = date ? { date } : {};
  return get<MyReportsResponse[]>('/reports/my-reports', params);
}

