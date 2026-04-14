export type Exam = 'NEET' | 'JEE' | 'UPSC' | 'CAT' | 'SSC';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'en' | 'hi';
export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  id: AnswerOption;
  text: string;
}

/** Mirrors the Question Mongoose document returned by the API. */
export interface Question {
  _id: string;
  exam: Exam;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  language: Language;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: AnswerOption;
  explanation: string;
  tags: string[];
  isAIGenerated: boolean;
  isPYQ: boolean;
  pyqYear?: number;
  stats: {
    totalAttempts: number;
    correctAttempts: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A question with runtime test-session state attached. */
export interface QuestionState extends Question {
  selectedAnswer: AnswerOption | null;
  isBookmarked: boolean;
  isAnswered: boolean;
  timeSpentSeconds: number;
}

/** Request body for POST /api/questions/generate */
export interface GenerateQuestionsRequest {
  exam: Exam;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  count: number;
  language: Language;
}

/** Data shape returned by POST /api/questions/generate */
export interface GenerateQuestionsResponse {
  questions: Question[];
  count: number;
  exam: Exam;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  language: Language;
}

/** Pagination metadata returned by list endpoints */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Data shape returned by GET /api/questions */
export interface QuestionsListResponse {
  questions: Question[];
  pagination: PaginationMeta;
}

/** Data shape returned by GET /api/questions/pyq */
export interface PYQsResponse {
  questions: Question[];
  pagination: PaginationMeta;
  availableYears: number[];
}

/** Query params for GET /api/questions */
export interface QuestionsFilter {
  exam?: Exam;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty;
  language?: Language;
  page?: number;
  limit?: number;
}
