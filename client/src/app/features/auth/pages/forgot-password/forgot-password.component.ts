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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">

      <!-- Back link -->
      <a
        routerLink="/auth/login"
        class="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors w-fit"
        aria-label="Back to login"
      >
        <span aria-hidden="true">←</span>
        <span>Back to Login</span>
      </a>

      <!-- Heading -->
      @if (!submitted()) {
        <div class="flex flex-col gap-1">
          <h2 class="font-heading font-bold text-xl text-white">Reset password</h2>
          <p class="text-white/50 text-sm">
            Enter your registered email — we'll send you a reset link.
          </p>
        </div>
      }

      <!-- Success state -->
      @if (submitted()) {
        <div class="flex flex-col items-center gap-4 py-4 text-center">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style="background: rgba(6,214,160,0.15); border: 1px solid rgba(6,214,160,0.3);"
            aria-hidden="true"
          >
            📬
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-heading font-bold text-lg text-white">Check your email</h3>
            <p class="text-white/50 text-sm leading-relaxed">
              We've sent a password reset link to
              <strong class="text-white">{{ submittedEmail() }}</strong>.
              The link expires in 15 minutes.
            </p>
          </div>
          <p class="text-white/30 text-xs">
            Didn't receive it? Check your spam folder or
            <button
              type="button"
              (click)="reset()"
              class="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      }

      <!-- Form — shown only before submission -->
      @if (!submitted()) {
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

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-4"
          novalidate
        >
          <div class="flex flex-col gap-1.5">
            <label for="forgot-email" class="text-sm font-medium text-white/70">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="input-field"
              [class.error]="showError(emailCtrl)"
              aria-required="true"
              [attr.aria-invalid]="showError(emailCtrl)"
            />
            @if (showError(emailCtrl)) {
              <p class="text-xs text-accent" role="alert">
                {{ emailError }}
              </p>
            }
          </div>

          <button
            type="submit"
            class="btn-primary w-full"
            [disabled]="isLoading()"
            aria-label="Send reset link"
          >
            @if (isLoading()) {
              <span
                class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              ></span>
              <span>Sending…</span>
            } @else {
              <span>Send Reset Link</span>
            }
          </button>
        </form>
      }

    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly submittedEmail = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected get emailCtrl(): AbstractControl {
    return this.form.get('email')!;
  }

  protected get emailError(): string {
    if (this.emailCtrl.hasError('required')) return 'Email is required';
    if (this.emailCtrl.hasError('email')) return 'Please enter a valid email address';
    return '';
  }

  protected showError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && ctrl.touched;
  }

  protected reset(): void {
    this.submitted.set(false);
    this.submittedEmail.set('');
    this.form.reset();
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    const email = this.form.value.email!;

    this.api
      .post<void>('/auth/forgot-password', { email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          this.submitted.set(true);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          // Show generic message to prevent email enumeration
          this.error.set(
            err.message || 'Something went wrong. Please try again.',
          );
          this.isLoading.set(false);
        },
      });
  }
}
