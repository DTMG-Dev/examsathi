import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import {
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AuthResponse,
} from '../models/user.model';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

/**
 * Central authentication service.
 * Manages JWT tokens, user state, and all auth API calls.
 * currentUser$ — reactive observable for components using async pipe.
 * currentUser  — signal for use in template expressions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _currentUser$ = new BehaviorSubject<User | null>(
    this.loadStoredUser(),
  );

  /** Observable stream of the current user — use with async pipe */
  readonly currentUser$ = this._currentUser$.asObservable();

  /** Signal version of the current user — use in template expressions */
  readonly currentUser = signal<User | null>(this.loadStoredUser());

  constructor() {
    // Keep signal in sync whenever BehaviorSubject changes
    this._currentUser$.subscribe((user) => this.currentUser.set(user));
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Reads the stored user object from localStorage.
   * Returns null if not found or if parsing fails.
   */
  private loadStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  /**
   * Persists tokens + user to localStorage and updates reactive state.
   */
  private persistSession(data: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this._currentUser$.next(data.user);
  }

  /**
   * Decodes the JWT payload (client-side only — no verification).
   * Used to check token expiry without a round-trip to the server.
   */
  private decodeTokenPayload(token: string): { exp: number } | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64)) as { exp: number };
    } catch {
      return null;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns true if a non-expired access token exists in localStorage.
   */
  isLoggedIn(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    const payload = this.decodeTokenPayload(token);
    if (!payload) return false;

    return payload.exp * 1000 > Date.now();
  }

  /**
   * Returns the current user snapshot (synchronous).
   */
  getCurrentUser(): User | null {
    return this._currentUser$.getValue();
  }

  /**
   * Returns the stored access token.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Logs in a user with email and password.
   * Persists tokens + user on success.
   */
  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api
      .post<AuthResponse>('/auth/login', credentials)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  /**
   * Registers a new user account.
   * Persists tokens + user on success.
   */
  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api
      .post<AuthResponse>('/auth/register', data)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  /**
   * Fetches the full current user profile from the server.
   * Updates local state with the fresh data.
   */
  refreshCurrentUser(): Observable<ApiResponse<{ user: User }>> {
    return this.api.get<{ user: User }>('/auth/me').pipe(
      tap((res) => {
        const updated = res.data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        this._currentUser$.next(updated);
      }),
    );
  }

  /**
   * Updates the authenticated user's profile fields.
   * Refreshes local state with the updated user.
   */
  updateProfile(
    data: UpdateProfileRequest,
  ): Observable<ApiResponse<{ user: User }>> {
    return this.api.put<{ user: User }>('/auth/profile', data).pipe(
      tap((res) => {
        const updated = res.data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        this._currentUser$.next(updated);
      }),
    );
  }

  /**
   * Changes the authenticated user's password.
   * Clears the session on success (forces re-login).
   */
  changePassword(
    data: ChangePasswordRequest,
  ): Observable<ApiResponse<Record<string, never>>> {
    return this.api
      .put<Record<string, never>>('/auth/password', data)
      .pipe(tap(() => this.logout()));
  }

  /**
   * Clears all auth state from localStorage and redirects to login.
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser$.next(null);
    this.router.navigate(['/auth/login']);
  }
}
