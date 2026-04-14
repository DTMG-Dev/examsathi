import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Standard success response envelope from the ExamSathi API. */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

/** Standard error response envelope from the ExamSathi API. */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: number;
  details?: string[];
}

/**
 * Base HTTP service — wraps Angular's HttpClient with typed API envelopes.
 * All feature services should inject this rather than HttpClient directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiUrl;

  /**
   * Sends a GET request and returns a typed API response.
   * @param endpoint - API path (e.g. '/users/me')
   * @param params   - Optional query string parameters
   */
  get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, value);
      });
    }
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params: httpParams,
    });
  }

  /**
   * Sends a POST request and returns a typed API response.
   */
  post<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a PUT request and returns a typed API response.
   */
  put<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a PATCH request and returns a typed API response.
   */
  patch<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a DELETE request and returns a typed API response.
   */
  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`);
  }

  /**
   * Sends a POST request with FormData (for file uploads).
   */
  upload<T>(endpoint: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(
      `${this.baseUrl}${endpoint}`,
      formData,
    );
  }
}
