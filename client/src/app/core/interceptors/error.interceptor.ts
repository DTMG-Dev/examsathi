import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Global HTTP error interceptor.
 * - 401: clears tokens and redirects to login
 * - All errors: normalises the error message from the API envelope
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.navigate(['/auth/login']);
      }

      // Extract the message from the standard API error envelope
      const message: string =
        error.error?.error ||
        error.error?.message ||
        error.message ||
        'An unexpected error occurred';

      return throwError(() => new Error(message));
    }),
  );
};
