import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import { DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  /** GET /api/dashboard — single aggregated payload */
  getData(): Observable<ApiResponse<DashboardData>> {
    return this.api.get<DashboardData>('/dashboard');
  }
}
