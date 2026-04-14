import { Question, AnswerOption } from './question.model';

export interface SubjectBreakdown {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

/** Full result returned by POST /api/tests/:id/finish */
export interface TestResult {
  sessionId: string;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: number;
  totalQuestions: number;
  subjectBreakdown: Record<string, SubjectBreakdown>;
  completedAt: string;
  exam: string;
  subject: string;
  topics: string[];
  difficulty: string;
}

/** Request body for POST /api/tests/start */
export interface StartTestRequest {
  questionIds: string[];
  exam: string;
  subject: string;
  topic: string;
  difficulty: string;
}

/** Response from POST /api/tests/start */
export interface StartTestResponse {
  sessionId: string;
  questions: Question[];
  totalQuestions: number;
}

/** Request body for PUT /api/tests/:id/answer */
export interface SubmitAnswerRequest {
  questionId: string;
  selectedAnswer: AnswerOption;
  timeTaken: number;
}

/** Summary row used in test history list */
export interface TestSummary {
  _id: string;
  exam: string;
  subject: string;
  topics: string[];
  difficulty: string;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  timeTaken: number;
  status: 'ongoing' | 'completed' | 'abandoned';
  completedAt?: string;
  createdAt: string;
}

export interface TestHistoryResponse {
  sessions: TestSummary[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

/** A single attempt enriched with the full question doc (from /api/tests/:id) */
export interface DetailedAttempt {
  questionId: string;
  selectedAnswer: AnswerOption | null;
  isCorrect: boolean;
  isSkipped: boolean;
  timeTaken: number;
  question: Question | null;
}

export interface TestDetailResponse {
  session: {
    _id: string;
    exam: string;
    subject: string;
    topics: string[];
    difficulty: string;
    accuracy: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    totalQuestions: number;
    timeTaken: number;
    subjectBreakdown: Record<string, SubjectBreakdown>;
    questions: DetailedAttempt[];
    completedAt?: string;
    createdAt: string;
  };
}
