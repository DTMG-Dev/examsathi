import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  QuestionsListResponse,
  PYQsResponse,
  QuestionsFilter,
} from '../models/question.model';
import type { ApiResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly api = inject(ApiService);

  /**
   * Calls POST /api/questions/generate.
   * Returns AI-generated questions (from cache or fresh Claude call).
   */
  generate(
    payload: GenerateQuestionsRequest,
  ): Observable<ApiResponse<GenerateQuestionsResponse>> {
    return this.api.post<GenerateQuestionsResponse>('/questions/generate', payload);
  }

  /**
   * Calls GET /api/questions with optional filter params.
   */
  list(filter: QuestionsFilter = {}): Observable<ApiResponse<QuestionsListResponse>> {
    const params: Record<string, string> = {};
    if (filter.exam) params['exam'] = filter.exam;
    if (filter.subject) params['subject'] = filter.subject;
    if (filter.topic) params['topic'] = filter.topic;
    if (filter.difficulty) params['difficulty'] = filter.difficulty;
    if (filter.language) params['language'] = filter.language;
    if (filter.page) params['page'] = String(filter.page);
    if (filter.limit) params['limit'] = String(filter.limit);

    return this.api.get<QuestionsListResponse>('/questions', params);
  }

  /**
   * Calls GET /api/questions/pyq — previous year questions.
   */
  getPYQs(
    exam?: string,
    subject?: string,
    year?: number,
    page = 1,
    limit = 20,
  ): Observable<ApiResponse<PYQsResponse>> {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (exam) params['exam'] = exam;
    if (subject) params['subject'] = subject;
    if (year) params['year'] = String(year);

    return this.api.get<PYQsResponse>('/questions/pyq', params);
  }
}
