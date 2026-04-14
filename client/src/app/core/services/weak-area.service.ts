import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  WeakAreasResponse,
  DueReviewsResponse,
  StartPracticeRequest,
  StartPracticeResponse,
  WeakAreaInsightsResponse,
} from '../models/weak-area.model';

@Injectable({ providedIn: 'root' })
export class WeakAreaService {
  private readonly api = inject(ApiService);

  /**
   * GET /api/weak-areas
   * Returns all weak areas grouped by subject with heatmap data.
   */
  getWeakAreas(exam?: string): Observable<ApiResponse<WeakAreasResponse>> {
    const params: Record<string, string> = {};
    if (exam) params['exam'] = exam;
    return this.api.get<WeakAreasResponse>('/weak-areas', params);
  }

  /**
   * GET /api/weak-areas/due-reviews
   * Returns topics due for spaced repetition review today.
   */
  getDueReviews(): Observable<ApiResponse<DueReviewsResponse>> {
    return this.api.get<DueReviewsResponse>('/weak-areas/due-reviews');
  }

  /**
   * POST /api/weak-areas/start-practice
   * Starts an adaptive test session targeting weak areas.
   */
  startPractice(
    payload: StartPracticeRequest = {},
  ): Observable<ApiResponse<StartPracticeResponse>> {
    return this.api.post<StartPracticeResponse>('/weak-areas/start-practice', payload);
  }

  /**
   * GET /api/weak-areas/insights
   * Returns AI-powered analysis and study recommendations.
   */
  getInsights(exam?: string): Observable<ApiResponse<WeakAreaInsightsResponse>> {
    const params: Record<string, string> = {};
    if (exam) params['exam'] = exam;
    return this.api.get<WeakAreaInsightsResponse>('/weak-areas/insights', params);
  }
}
