export interface DashboardStats {
  testsTaken: number;
  avgAccuracy: number;
  questionsSolved: number;
  studyStreak: number;
}

export interface DashboardWeakArea {
  _id: string;
  subject: string;
  topic: string;
  accuracy: number;
  priority: 'critical' | 'moderate' | 'good';
  exam: string;
}

export interface TodayTopic {
  _id: string;
  subject: string;
  topic: string;
  isCompleted: boolean;
  estimatedHours: number;
}

export interface TodaysPlan {
  topics: TodayTopic[];
  completedCount: number;
  totalCount: number;
}

export interface RecentTest {
  _id: string;
  exam: string;
  subject: string;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  difficulty: string;
  timeTaken: number;
  createdAt: string;
}

export interface ExamCountdown {
  daysRemaining: number;
  readinessPercent: number;
  examDate: string;
  exam: string;
}

export interface LeaderboardStudent {
  name: string;
  accuracy: number;
  rank: number;
}

export interface DashboardData {
  user: {
    name: string;
    streak: { current: number; longest: number };
    targetExam?: string;
    profilePic?: string;
    subscription: { plan: string; isActive: boolean };
  };
  stats: DashboardStats;
  weakAreas: DashboardWeakArea[];
  todaysPlan: TodaysPlan;
  recentTests: RecentTest[];
  spacedRepetitionCount: number;
  examCountdown: ExamCountdown | null;
  leaderboardPreview: { myRank: number | null; topStudents: LeaderboardStudent[] };
}
