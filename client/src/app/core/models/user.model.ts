/** Mirrors the User Mongoose document shape returned by the API. */
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'institute_admin' | 'super_admin';
  phone?: string;
  profilePic?: string;
  preferredLanguage: 'en' | 'hi' | 'te' | 'ta';
  targetExam?: 'NEET' | 'JEE' | 'UPSC' | 'CAT' | 'SSC';
  examDate?: string;
  dailyStudyHours: number;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'institute';
    isActive: boolean;
    startDate?: string;
    endDate?: string;
  };
  streak: {
    current: number;
    longest: number;
    lastStudied?: string;
  };
  instituteId?: {
    _id: string;
    name: string;
    logo?: string;
    brandColor?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Request body for POST /api/auth/register */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  targetExam?: User['targetExam'];
  examDate?: string;
  dailyStudyHours?: number;
}

/** Request body for PUT /api/auth/profile */
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  targetExam?: User['targetExam'];
  examDate?: string;
  dailyStudyHours?: number;
  preferredLanguage?: User['preferredLanguage'];
}

/** Request body for PUT /api/auth/password */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Data shape returned by login/register endpoints */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
