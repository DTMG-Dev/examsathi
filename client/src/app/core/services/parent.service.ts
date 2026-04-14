import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  LinkedChild,
  ChildProgress,
  WeeklyReport,
  WeakArea,
} from '../models/parent.model';

@Injectable({ providedIn: 'root' })
export class ParentService {
  private readonly api = inject(ApiService);

  /** POST /api/parent/link-child — link a student by email */
  linkChild(email: string): Observable<ApiResponse<{ child: LinkedChild }>> {
    return this.api.post('/parent/link-child', { email });
  }

  /** GET /api/parent/children — list all linked children */
  getMyChildren(): Observable<ApiResponse<{ children: LinkedChild[] }>> {
    return this.api.get('/parent/children');
  }

  /** GET /api/parent/child/:id/progress — full 30-day progress */
  getChildProgress(childId: string): Observable<ApiResponse<ChildProgress>> {
    return this.api.get(`/parent/child/${childId}/progress`);
  }

  /** GET /api/parent/child/:id/weekly-report — 7-day summary */
  getWeeklyReport(childId: string): Observable<ApiResponse<WeeklyReport>> {
    return this.api.get(`/parent/child/${childId}/weekly-report`);
  }

  /** GET /api/parent/child/:id/weak-areas — unmastered weak topics */
  getChildWeakAreas(childId: string): Observable<ApiResponse<{ weakAreas: WeakArea[] }>> {
    return this.api.get(`/parent/child/${childId}/weak-areas`);
  }
}
