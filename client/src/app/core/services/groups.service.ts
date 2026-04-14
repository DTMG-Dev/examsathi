import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  StudyGroup,
  StudyGroupSummary,
  CreateGroupRequest,
  CreateChallengeRequest,
  JoinGroupRequest,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
  LeaderboardEntry,
  ExamType,
} from '../models/study-group.model';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly api = inject(ApiService);

  /**
   * POST /api/groups
   * Create a new study group.
   */
  createGroup(body: CreateGroupRequest): Observable<ApiResponse<StudyGroup>> {
    return this.api.post<StudyGroup>('/groups', body);
  }

  /**
   * POST /api/groups/join
   * Join a group via invite code.
   */
  joinGroup(body: JoinGroupRequest): Observable<ApiResponse<{ groupId: string; name: string }>> {
    return this.api.post('/groups/join', body);
  }

  /**
   * GET /api/groups
   * Get my groups (summary list).
   */
  getMyGroups(): Observable<ApiResponse<StudyGroupSummary[]>> {
    return this.api.get<StudyGroupSummary[]>('/groups');
  }

  /**
   * GET /api/groups?discover=true&exam=...
   * Discover public groups.
   */
  discoverGroups(exam?: ExamType): Observable<ApiResponse<StudyGroupSummary[]>> {
    const params: Record<string, string> = { discover: 'true' };
    if (exam) params['exam'] = exam;
    return this.api.get<StudyGroupSummary[]>('/groups', params);
  }

  /**
   * GET /api/groups/:id
   * Full group detail with members and challenges.
   */
  getGroupDetail(groupId: string): Observable<ApiResponse<StudyGroup>> {
    return this.api.get<StudyGroup>(`/groups/${groupId}`);
  }

  /**
   * POST /api/groups/:id/challenge
   * Create a challenge inside the group.
   */
  createChallenge(
    groupId: string,
    body: CreateChallengeRequest,
  ): Observable<ApiResponse<import('../models/study-group.model').Challenge>> {
    return this.api.post(`/groups/${groupId}/challenge`, body);
  }

  /**
   * POST /api/groups/:id/challenge/:cId/submit
   * Submit answers for a challenge.
   */
  submitChallenge(
    groupId: string,
    challengeId: string,
    body: SubmitChallengeRequest,
  ): Observable<ApiResponse<SubmitChallengeResponse>> {
    return this.api.post(`/groups/${groupId}/challenge/${challengeId}/submit`, body);
  }

  /**
   * GET /api/groups/:id/leaderboard
   */
  getLeaderboard(groupId: string): Observable<ApiResponse<{ leaderboard: LeaderboardEntry[]; totalMembers: number }>> {
    return this.api.get(`/groups/${groupId}/leaderboard`);
  }
}
