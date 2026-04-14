import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  DestroyRef,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequest } from '../../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">

      <!-- Heading -->
      <div class="flex flex-col gap-1">
        <h2 class="font-heading font-bold text-xl text-white">Welcome back</h2>
        <p class="text-white/50 text-sm">Sign in to continue your exam preparation</p>
      </div>

      <!-- Error alert -->
      @if (error()) {
        <div
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm animate-shake"
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      }

      <!-- Form -->
      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4"
        novalidate
      >
        <!-- Email -->
        <div class="flex flex-col gap-1.5">
          <label for="email" class="text-sm font-medium text-white/70">
            Email address
          </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="you@example.com"
            class="input-field"
            [class.error]="showError(emailCtrl)"
            aria-required="true"
            [attr.aria-invalid]="showError(emailCtrl)"
            [attr.aria-describedby]="showError(emailCtrl) ? 'email-error' : null"
          />
          @if (showError(emailCtrl)) {
            <p id="email-error" class="text-xs text-accent mt-0.5" role="alert">
              {{ getError(emailCtrl, 'email') }}
            </p>
          }
        </div>

        <!-- Password -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label for="password" class="text-sm font-medium text-white/70">
              Password
            </label>
            <a
              routerLink="/auth/forgot-password"
              class="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Min. 8 characters"
              class="input-field pr-12"
              [class.error]="showError(passwordCtrl)"
              aria-required="true"
              [attr.aria-invalid]="showError(passwordCtrl)"
              [attr.aria-describedby]="showError(passwordCtrl) ? 'password-error' : null"
            />
            <button
              type="button"
              (click)="togglePassword()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              style="min-width: 32px; min-height: 32px;"
            >
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>
          @if (showError(passwordCtrl)) {
            <p id="password-error" class="text-xs text-accent mt-0.5" role="alert">
              {{ getError(passwordCtrl, 'password') }}
            </p>
          }
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="btn-primary w-full mt-2"
          [disabled]="isLoading()"
          aria-label="Sign in to ExamSathi"
        >
          @if (isLoading()) {
            <span
              class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden="true"
            ></span>
            <span>Signing in…</span>
          } @else {
            <span>Sign In</span>
          }
        </button>
      </form>

      <!-- Divider -->
      <div class="flex items-center gap-3">
        <div class="flex-1 h-px bg-white/10"></div>
        <span class="text-white/30 text-xs">or</span>
        <div class="flex-1 h-px bg-white/10"></div>
      </div>

      <!-- Google sign-in (UI only — OAuth integration in next phase) -->
      <button
        type="button"
        class="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all duration-200 font-medium text-sm"
        style="min-height: 44px;"
        disabled
        aria-label="Continue with Google (coming soon)"
        title="Google sign-in coming soon"
      >
        <!-- Google logo SVG -->
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
        <span class="ml-auto text-[10px] text-white/30 font-normal">Soon</span>
      </button>

      <!-- Register link -->
      <p class="text-center text-white/50 text-sm">
        Don't have an account?
        <a
          routerLink="/auth/register"
          class="text-primary font-medium hover:text-primary/80 transition-colors ml-1"
        >
          Register free
        </a>
      </p>

    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // ── Template helpers ──────────────────────────────────────────────────────

  protected get emailCtrl(): AbstractControl {
    return this.form.get('email')!;
  }

  protected get passwordCtrl(): AbstractControl {
    return this.form.get('password')!;
  }

  /** Returns true when a field should show its error message. */
  protected showError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && ctrl.touched;
  }

  /** Returns a human-readable error message for a form control. */
  protected getError(ctrl: AbstractControl, field: 'email' | 'password'): string {
    if (ctrl.hasError('required')) {
      return field === 'email' ? 'Email is required' : 'Password is required';
    }
    if (ctrl.hasError('email')) return 'Please enter a valid email address';
    if (ctrl.hasError('minlength')) return 'Password must be at least 8 characters';
    return '';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.auth
      .login(this.form.value as LoginRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Login failed. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}
