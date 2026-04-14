export interface RoadmapTopic {
  _id: string;
  subject: string;
  topic: string;
  targetDate: string;
  estimatedHours: number;
  isCompleted: boolean;
  completedAt?: string;
  resources: string[];
}

export interface RoadmapWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weeklyGoalHours: number;
  topics: RoadmapTopic[];
  isCompleted: boolean;
}

export interface StudyRoadmap {
  _id: string;
  exam: string;
  examDate: string;
  dailyHours: number;
  overallProgress: number;
  weeks: RoadmapWeek[];
  weakAreasFocused: string[];
  strategy?: string;
  isActive: boolean;
  aiGeneratedAt?: string;
  version: number;
  createdAt: string;
}

export interface GenerateRoadmapRequest {
  exam?: string;
  examDate?: string;
  dailyHours?: number;
}
