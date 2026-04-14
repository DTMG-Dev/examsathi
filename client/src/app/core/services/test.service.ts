import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  StartTestRequest,
  StartTestResponse,
  SubmitAnswerRequest,
  TestResult,
  TestHistoryResponse,
  TestDetailResponse,
} from '../models/test-session.model';

@Injectable({ providedIn: 'root' })
export class TestService {
  private readonly api = inject(ApiService);

  startTest(payload: StartTestRequest): Observable<ApiResponse<StartTestResponse>> {
    return this.api.post<StartTestResponse>('/tests/start', payload);
  }

  submitAnswer(
    sessionId: string,
    payload: SubmitAnswerRequest,
  ): Observable<ApiResponse<unknown>> {
    return this.api.put<unknown>(`/tests/${sessionId}/answer`, payload);
  }

  finishTest(
    sessionId: string,
    payload: { totalTimeTaken: number },
  ): Observable<ApiResponse<TestResult>> {
    return this.api.post<TestResult>(`/tests/${sessionId}/finish`, payload);
  }

  getHistory(
    page = 1,
    limit = 10,
    exam?: string,
  ): Observable<ApiResponse<TestHistoryResponse>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (exam) params['exam'] = exam;
    return this.api.get<TestHistoryResponse>('/tests/history', params);
  }

  getDetail(sessionId: string): Observable<ApiResponse<TestDetailResponse>> {
    return this.api.get<TestDetailResponse>(`/tests/${sessionId}`);
  }
}
