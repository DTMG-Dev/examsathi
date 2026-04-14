// ─── Priority & Trend ─────────────────────────────────────────────────────────

export type WeakAreaPriority = 'critical' | 'moderate' | 'good';
export type WeakAreaTrend    = 'improving' | 'declining' | 'stable' | 'insufficient_data';

// ─── Core WeakArea ────────────────────────────────────────────────────────────

export interface WeakArea {
  _id: string;
  userId: string;
  exam: string;
  subject: string;
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;               // 0–100
  lastAttempted: string | null;
  nextReviewDate: string;
  priority: WeakAreaPriority;
  repetitionCount: number;
  recentScores: number[];
  isMastered: boolean;
  masteredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Subject Heatmap ──────────────────────────────────────────────────────────

export interface HeatmapTopic {
  topic: string;
  accuracy: number;
  priority: WeakAreaPriority;
  isMastered: boolean;
  trend: WeakAreaTrend;
}

export interface SubjectHeatmap {
  subject: string;
  avgAccuracy: number;
  topicsCount: number;
  criticalCount: number;
  masteredCount: number;
  topics: HeatmapTopic[];
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface WeakAreaSummary {
  total: number;
  critical: number;
  moderate: number;
  good: number;
  mastered: number;
}

export interface WeakAreasResponse {
  summary: WeakAreaSummary;
  avgAccuracy: number;
  heatmap: SubjectHeatmap[];
  weakAreas: WeakArea[];
}

export interface DueReviewsResponse {
  count: number;
  reviews: WeakArea[];
}

// ─── Adaptive Test ────────────────────────────────────────────────────────────

export interface WeakAreaSampled {
  subject: string;
  topic: string;
  accuracy: number;
  priority: WeakAreaPriority;
}

export interface StartPracticeRequest {
  count?: number;
}

export interface StartPracticeResponse {
  sessionId: string;
  totalQuestions: number;
  weakAreasSampled: WeakAreaSampled[];
  questions: import('./question.model').Question[];
  isAdaptive: boolean;
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export interface WeakAreaInsight {
  subject: string;
  topic: string;
  accuracy: number;
  priority: WeakAreaPriority;
  trend: WeakAreaTrend;
}

export interface AIInsights {
  overallAccuracy: number;
  strengths: string[];
  weaknesses: string[];
  studyPriority: string[];
  predictedScore: number;
  improvementTips: string[];
}

export interface WeakAreaInsightsResponse {
  hasInsights: boolean;
  message?: string;
  insights?: AIInsights;
  topWeakAreas?: WeakAreaInsight[];
  analysedSessions?: number;
}
