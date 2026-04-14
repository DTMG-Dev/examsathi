// ── Child entities ────────────────────────────────────────────────────────────

export interface LinkedChild {
  _id:        string;
  name:       string;
  email:      string;
  targetExam: string | null;
  examDate:   string | null;
  profilePic: string | null;
}

export interface ChildProfile extends LinkedChild {
  streak: { current: number; longest: number; lastStudied?: string };
}

// ── Progress data shapes ──────────────────────────────────────────────────────

export interface ProgressSummary {
  studyStreak:    number;
  testsThisWeek:  number;
  avgScore:       number;
  readinessScore: number;
}

export interface ScoreTrendPoint {
  date:     string;
  accuracy: number;
  subject:  string;
}

export interface SubjectPerformance {
  subject:  string;
  accuracy: number;
  tests:    number;
}

export interface DailyStudyPoint {
  date:    string;
  minutes: number;
}

export interface HeatmapCell {
  hour:  number;
  count: number;
}

export interface ProgressAlert {
  type:    'warning' | 'success' | 'info';
  message: string;
}

export interface ChildProgress {
  child:              ChildProfile;
  summary:            ProgressSummary;
  scoreTrend:         ScoreTrendPoint[];
  subjectPerformance: SubjectPerformance[];
  dailyStudyTime:     DailyStudyPoint[];
  studyHeatmap:       HeatmapCell[];
  alerts:             ProgressAlert[];
}

// ── Weekly report ─────────────────────────────────────────────────────────────

export interface WeeklyReport {
  week:            string;
  testsTaken:      number;
  totalScore:      number;
  avgAccuracy:     number;
  improvement:     number;   // delta vs previous week (can be negative)
  topSubject:      string;
  weakestSubject:  string;
  recommendations: string[];
}

// ── Weak areas ────────────────────────────────────────────────────────────────

export interface WeakArea {
  subject:       string;
  topic:         string;
  accuracy:      number;
  attempts:      number;
  priority:      'critical' | 'moderate' | 'good';
  lastAttempted: string;
}

// ── Computed chart helpers (used in component) ────────────────────────────────

export interface ChartDot {
  x:        number;
  y:        number;
  accuracy: number;
  date:     string;
}

export interface RadarLabel {
  subject:  string;
  accuracy: number;
  x:        number;
  y:        number;
}

export interface RadarAxis {
  x2: number;
  y2: number;
}

export interface RadarGrid {
  pct:    number;
  points: string;
}
