export type ExamType = 'NEET' | 'JEE' | 'UPSC' | 'CAT' | 'SSC';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface Batch {
  _id:           string;
  name:          string;
  exam:          ExamType;
  studentIds:    string[];
  assignedTests: string[];
  startDate?:    string;
  endDate?:      string;
  isActive:      boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface InstituteAddress {
  street?: string;
  city?:   string;
  state?:  string;
  pincode?: string;
}

export interface InstituteSubscription {
  plan:        'starter' | 'growth' | 'enterprise';
  maxStudents: number;
  startDate?:  string;
  endDate?:    string;
  isActive:    boolean;
}

export interface InstituteStats {
  totalStudents:  number;
  activeStudents: number;
  testsAssigned:  number;
  avgAccuracy:    number;
}

export interface Institute {
  _id:         string;
  name:        string;
  email:       string;
  phone?:      string;
  address?:    InstituteAddress;
  logo:        string | null;
  brandColor:  string;
  customDomain: string | null;
  adminId:     string;
  students:    string[];
  batches:     Batch[];
  subscription: InstituteSubscription;
  isVerified:  boolean;
  isActive:    boolean;
  stats:       InstituteStats;
  createdAt:   string;
  updatedAt:   string;
}

export interface LiveStats {
  totalStudents: number;
  activeToday:   number;
  avgScore:      number;
  testsAssigned: number;
  totalTests:    number;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateInstituteRequest {
  name:        string;
  email:       string;
  phone?:      string;
  address?:    InstituteAddress;
  brandColor?: string;
}

export interface CreateBatchRequest {
  name:       string;
  exam:       ExamType;
  startDate?: string;
  endDate?:   string;
}

export interface AddStudentsRequest {
  students?: { name: string; email: string; phone?: string }[];
  csvData?:  string;
}

export interface AssignTestRequest {
  exam:           ExamType;
  subject:        string;
  topics?:        string[];
  difficulty:     Difficulty;
  questionCount:  number;
  duration:       number; // minutes
  scheduledAt?:   string; // ISO datetime
}

export interface UpdateSettingsRequest {
  name?:         string;
  brandColor?:   string;
  logo?:         string;
  customDomain?: string;
  phone?:        string;
  address?:      InstituteAddress;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface StudentResult {
  _id:          string;
  userId:       string;
  student:      { _id: string; name: string; email: string; profilePic: string | null };
  exam:         string;
  subject:      string;
  accuracy:     number;
  score:        number;
  correctCount: number;
  totalQuestions: number;
  timeTaken:    number;
  completedAt:  string;
  rank:         number;
  belowAvgFlag: boolean;
}

export interface ClassStats {
  totalStudents:  number;
  attempted:      number;
  classAvg:       number;
  topper:         StudentResult | null;
  belowThreshold: number;
}

export interface BatchResultsResponse {
  results:    StudentResult[];
  batch:      { _id: string; name: string; exam: string };
  classStats: ClassStats;
}

export interface ReportStudentRow {
  student:          { _id: string; name: string; email: string };
  tests:            number;
  avgAccuracy:      number;
  subjectBreakdown: { subject: string; attempts: number; avg: number }[];
}

export interface ReportData {
  generatedAt: string;
  institute:   { name: string; logo: string | null; brandColor: string };
  scope:       { type: 'batch' | 'institute'; name?: string; exam?: string };
  dateRange:   { from: string | null; to: string | null };
  summary:     {
    totalStudents: number;
    totalTests:    number;
    avgAccuracy:   number;
    topperName:    string;
    topperScore:   number;
    below40Pct:    number;
  };
  studentRows: ReportStudentRow[];
}

export interface AddStudentsResult {
  added:   { email: string; name: string; isNew: boolean }[];
  skipped: { email: string; reason: string }[];
  errors:  { email: string; reason: string }[];
}
