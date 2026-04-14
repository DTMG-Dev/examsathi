export type MemberRole = 'admin' | 'moderator' | 'member';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExamType   = 'NEET' | 'JEE' | 'UPSC' | 'CAT' | 'SSC';

export interface GroupMember {
  userId:   string;
  joinedAt: string;
  role:     MemberRole;
  user?: {
    _id:        string;
    name:       string;
    email:      string;
    profilePic: string | null;
  };
}

export interface ChallengeParticipant {
  userId:      string;
  score:       number;
  accuracy:    number;
  completedAt: string | null;
  timeTaken:   number;
  rank:        number | null;
}

export interface Challenge {
  _id:           string;
  title:         string;
  description?:  string;
  topic:         string;
  subject:       string;
  difficulty:    Difficulty;
  questionCount: number;
  createdBy:     string;
  dueDate:       string;
  participants:  ChallengeParticipant[];
  isActive:      boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface LeaderboardEntry {
  rank:                number;
  totalScore:          number;
  challengesCompleted: number;
  isMe?:               boolean;
  userId?:             string;
  user?: {
    _id:        string;
    name:       string;
    profilePic: string | null;
  };
}

export interface StudyGroup {
  _id:             string;
  name:            string;
  description:     string;
  exam:            ExamType;
  createdBy:       string;
  members:         GroupMember[];
  challenges:      Challenge[];
  isPublic:        boolean;
  inviteCode:      string;
  maxMembers:      number;
  isActive:        boolean;
  leaderboard:     LeaderboardEntry[];
  lastActivityAt:  string;
  createdAt:       string;
  updatedAt:       string;
  // computed by server
  isMember?:       boolean;
  myRole?:         MemberRole | null;
}

export interface StudyGroupSummary {
  _id:             string;
  name:            string;
  description:     string;
  exam:            ExamType;
  memberCount:     number;
  maxMembers:      number;
  activeChallenges: number;
  lastActivityAt:  string;
  inviteCode:      string;
  myRole:          MemberRole;
}

// ── API request/response shapes ──────────────────────────────────────────────

export interface CreateGroupRequest {
  name:        string;
  description?: string;
  exam:        ExamType;
  isPublic?:   boolean;
  maxMembers?: number;
}

export interface JoinGroupRequest {
  inviteCode: string;
}

export interface CreateChallengeRequest {
  title:         string;
  description?:  string;
  topic:         string;
  subject:       string;
  difficulty:    Difficulty;
  questionCount?: number;
  dueDate:       string; // ISO string
}

export interface SubmitChallengeRequest {
  answers:    { questionId: string; selectedAnswer: string }[];
  timeTaken:  number; // seconds
}

export interface SubmitChallengeResponse {
  score:        number;
  accuracy:     number;
  correct:      number;
  total:        number;
  rank:         number;
  participants: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message: string;
}
