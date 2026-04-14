import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  Institute,
  LiveStats,
  Batch,
  StudentResult,
  BatchResultsResponse,
  ReportData,
  CreateInstituteRequest,
  CreateBatchRequest,
  AddStudentsRequest,
  AddStudentsResult,
  AssignTestRequest,
  UpdateSettingsRequest,
} from '../models/institute.model';

@Injectable({ providedIn: 'root' })
export class InstituteService {
  private readonly api = inject(ApiService);

  /** POST /api/institute — register a new institute */
  createInstitute(body: CreateInstituteRequest): Observable<ApiResponse<Institute>> {
    return this.api.post<Institute>('/institute', body);
  }

  /** GET /api/institute/stats — load institute + live stats */
  getStats(): Observable<ApiResponse<{ institute: Institute; stats: LiveStats }>> {
    return this.api.get('/institute/stats');
  }

  /** PATCH /api/institute — update branding / settings */
  updateSettings(body: UpdateSettingsRequest): Observable<ApiResponse<Institute>> {
    return this.api.patch<Institute>('/institute', body);
  }

  /** POST /api/institute/batch — create a new batch */
  createBatch(body: CreateBatchRequest): Observable<ApiResponse<Batch>> {
    return this.api.post<Batch>('/institute/batch', body);
  }

  /** POST /api/institute/batch/:id/students — add students */
  addStudents(batchId: string, body: AddStudentsRequest): Observable<ApiResponse<AddStudentsResult>> {
    return this.api.post<AddStudentsResult>(`/institute/batch/${batchId}/students`, body);
  }

  /** POST /api/institute/batch/:id/assign-test — assign & create sessions */
  assignTest(batchId: string, body: AssignTestRequest): Observable<ApiResponse<{ sessionsCreated: number; questionCount: number }>> {
    return this.api.post(`/institute/batch/${batchId}/assign-test`, body);
  }

  /** GET /api/institute/batch/:id/results */
  getBatchResults(
    batchId: string,
    params?: { exam?: string; subject?: string; from?: string },
  ): Observable<ApiResponse<BatchResultsResponse>> {
    const p: Record<string, string> = {};
    if (params?.exam)    p['exam']    = params.exam;
    if (params?.subject) p['subject'] = params.subject;
    if (params?.from)    p['from']    = params.from;
    return this.api.get<BatchResultsResponse>(`/institute/batch/${batchId}/results`, p);
  }

  /** GET /api/institute/report */
  generateReport(params?: { batchId?: string; from?: string; to?: string }): Observable<ApiResponse<{ reportData: ReportData }>> {
    const p: Record<string, string> = {};
    if (params?.batchId) p['batchId'] = params.batchId;
    if (params?.from)    p['from']    = params.from;
    if (params?.to)      p['to']      = params.to;
    return this.api.get('/institute/report', p);
  }
}
