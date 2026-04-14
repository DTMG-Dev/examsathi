import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import { StudyRoadmap, GenerateRoadmapRequest } from '../models/roadmap.model';

@Injectable({ providedIn: 'root' })
export class RoadmapService {
  private readonly api = inject(ApiService);

  generate(payload: GenerateRoadmapRequest = {}): Observable<ApiResponse<StudyRoadmap>> {
    return this.api.post<StudyRoadmap>('/roadmap/generate', payload);
  }

  getCurrent(): Observable<ApiResponse<StudyRoadmap | null>> {
    return this.api.get<StudyRoadmap | null>('/roadmap');
  }

  updateTopicStatus(
    topicId: string,
    isCompleted: boolean,
  ): Observable<ApiResponse<{ overallProgress: number }>> {
    return this.api.put<{ overallProgress: number }>(`/roadmap/topic/${topicId}`, {
      isCompleted,
    });
  }

  regenerate(payload: GenerateRoadmapRequest = {}): Observable<ApiResponse<StudyRoadmap>> {
    return this.api.post<StudyRoadmap>('/roadmap/regenerate', payload);
  }
}
