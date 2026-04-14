import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  DestroyRef,
  computed,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequest } from '../../../../core/models/user.model';

// ── Custom validators ─────────────────────────────────────────────────────────

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

const futureDateValidator: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  if (!ctrl.value) return null;
  return new Date(ctrl.value) > new Date() ? null : { pastDate: true };
};

// ── Exam catalogue ────────────────────────────────────────────────────────────

interface ExamCard {
  id: 'NEET' | 'JEE' | 'UPSC' | 'CAT' | 'SSC';
  name: string;
  icon: string;
  desc: string;
  subjects: string;
  colour: string;
}

const EXAM_CARDS: ExamCard[] = [
  {
    id: 'NEET',
    name: 'NEET',
    icon: '🧬',
    desc: 'Medical Entrance',
    subjects: 'Biology · Chemistry · Physics',
    colour: '#06D6A0',
  },
  {
    id: 'JEE',
    name: 'JEE',
    icon: '⚙️',
    desc: 'Engineering Entrance',
    subjects: 'Physics · Chemistry · Maths',
    colour: '#4CC9F0',
  },
  {
    id: 'UPSC',
    name: 'UPSC',
    icon: '🏛️',
    desc: 'Civil Services',
    subjects: 'GS · CSAT · Optional',
    colour: '#F72585',
  },
  {
    id: 'CAT',
    name: 'CAT',
    icon: '📊',
    desc: 'MBA Entrance',
    subjects: 'Quant · Verbal · LRDI',
    colour: '#FFD166',
  },
  {
    id: 'SSC',
    name: 'SSC',
    icon: '📋',
    desc: 'Government Jobs',
    subjects: 'Reasoning · Maths · English',
    colour: '#FF6B35',
  },
];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">

      <!-- Step progress indicator -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="font-heading font-bold text-xl text-white">Create account</h2>
          <span class="text-white/40 text-xs font-medium">
            Step {{ currentStep() }} of 3
          </span>
        </div>
        <!-- Progress bar -->
        <div class="flex gap-1.5" role="progressbar" [attr.aria-valuenow]="currentStep()" aria-valuemin="1" aria-valuemax="3">
          @for (step of [1, 2, 3]; track step) {
            <div
              class="h-1 flex-1 rounded-full transition-all duration-500"
              [style.background]="currentStep() >= step
                ? 'linear-gradient(90deg, #FF6B35, #E94560)'
                : 'rgba(255,255,255,0.1)'"
            ></div>
          }
        </div>
        <p class="text-white/40 text-xs">{{ stepLabels[currentStep() - 1] }}</p>
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

      <!-- ── STEP 1: Basic information ───────────────────────────────── -->
      @if (currentStep() === 1) {
        <form
          [formGroup]="step1"
          (ngSubmit)="nextStep()"
          class="flex flex-col gap-4"
          novalidate
        >
          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label for="name" class="text-sm font-medium text-white/70">Full name</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              autocomplete="name"
              placeholder="Rahul Sharma"
              class="input-field"
              [class.error]="showError(step1.get('name')!)"
              aria-required="true"
            />
            @if (showError(step1.get('name')!)) {
              <p class="text-xs text-accent" role="alert">
                {{ nameError }}
              </p>
            }
          </div>

          <!-- Email -->
          <div class="flex flex-col gap-1.5">
            <label for="reg-email" class="text-sm font-medium text-white/70">Email address</label>
            <input
              id="reg-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="input-field"
              [class.error]="showError(step1.get('email')!)"
              aria-required="true"
            />
            @if (showError(step1.get('email')!)) {
              <p class="text-xs text-accent" role="alert">
                {{ emailError }}
              </p>
            }
          </div>

          <!-- Phone -->
          <div class="flex flex-col gap-1.5">
            <label for="phone" class="text-sm font-medium text-white/70">
              Mobile number
            </label>
            <div class="flex gap-2">
              <div
                class="flex items-center px-3 rounded-xl bg-card-bg border border-white/10 text-white/50 text-sm flex-shrink-0"
                style="min-height: 44px;"
              >
                🇮🇳 +91
              </div>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                autocomplete="tel"
                placeholder="9876543210"
                class="input-field flex-1"
                [class.error]="showError(step1.get('phone')!)"
                aria-required="true"
                maxlength="10"
              />
            </div>
            @if (showError(step1.get('phone')!)) {
              <p class="text-xs text-accent" role="alert">Enter a valid 10-digit mobile number</p>
            }
          </div>

          <!-- Password -->
          <div class="flex flex-col gap-1.5">
            <label for="reg-password" class="text-sm font-medium text-white/70">Password</label>
            <div class="relative">
              <input
                id="reg-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                placeholder="Min. 8 characters"
                class="input-field pr-12"
                [class.error]="showError(step1.get('password')!)"
                aria-required="true"
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
            <!-- Password strength hints -->
            <div class="flex gap-3 flex-wrap">
              @for (hint of passwordHints(); track hint.label) {
                <span
                  class="flex items-center gap-1 text-[11px] transition-colors duration-200"
                  [style.color]="hint.met ? '#06D6A0' : 'rgba(255,255,255,0.3)'"
                >
                  <span aria-hidden="true">{{ hint.met ? '✓' : '○' }}</span>
                  {{ hint.label }}
                </span>
              }
            </div>
            @if (showError(step1.get('password')!)) {
              <p class="text-xs text-accent" role="alert">{{ passwordError }}</p>
            }
          </div>

          <!-- Confirm password -->
          <div class="flex flex-col gap-1.5">
            <label for="confirmPassword" class="text-sm font-medium text-white/70">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
              placeholder="Re-enter your password"
              class="input-field"
              [class.error]="step1.hasError('passwordMismatch') && step1.get('confirmPassword')?.touched"
              aria-required="true"
            />
            @if (step1.hasError('passwordMismatch') && step1.get('confirmPassword')?.touched) {
              <p class="text-xs text-accent" role="alert">Passwords do not match</p>
            }
          </div>

          <button type="submit" class="btn-primary w-full mt-2" aria-label="Continue to step 2">
            Continue →
          </button>
        </form>
      }

      <!-- ── STEP 2: Target exam selection ──────────────────────────── -->
      @if (currentStep() === 2) {
        <div class="flex flex-col gap-4">
          <p class="text-white/60 text-sm">Which exam are you preparing for?</p>

          <div class="flex flex-col gap-3">
            @for (exam of examCards; track exam.id) {
              <button
                type="button"
                (click)="selectExam(exam.id)"
                class="flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all duration-200 text-left"
                [class]="selectedExam() === exam.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'"
                style="min-height: 44px;"
                [attr.aria-pressed]="selectedExam() === exam.id"
                [attr.aria-label]="exam.name + ' — ' + exam.desc"
              >
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  [style.background]="exam.colour + '20'"
                >
                  {{ exam.icon }}
                </div>
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-heading font-bold text-white text-sm">{{ exam.name }}</span>
                    <span
                      class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      [style.color]="exam.colour"
                      [style.background]="exam.colour + '20'"
                    >
                      {{ exam.desc }}
                    </span>
                  </div>
                  <span class="text-white/40 text-xs mt-0.5 truncate">{{ exam.subjects }}</span>
                </div>
                @if (selectedExam() === exam.id) {
                  <span class="text-primary text-lg flex-shrink-0" aria-hidden="true">✓</span>
                }
              </button>
            }
          </div>

          @if (examError()) {
            <p class="text-xs text-accent" role="alert">Please select an exam to continue</p>
          }

          <div class="flex gap-3 mt-2">
            <button
              type="button"
              (click)="prevStep()"
              class="btn-secondary flex-1"
              aria-label="Go back to step 1"
            >
              ← Back
            </button>
            <button
              type="button"
              (click)="nextStep()"
              class="btn-primary flex-1"
              aria-label="Continue to step 3"
            >
              Continue →
            </button>
          </div>
        </div>
      }

      <!-- ── STEP 3: Exam date + study hours ────────────────────────── -->
      @if (currentStep() === 3) {
        <form
          [formGroup]="step3"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-5"
          novalidate
        >
          <!-- Exam date -->
          <div class="flex flex-col gap-1.5">
            <label for="examDate" class="text-sm font-medium text-white/70">
              🗓️ Exam date
            </label>
            <input
              id="examDate"
              type="date"
              formControlName="examDate"
              class="input-field"
              [class.error]="showError(step3.get('examDate')!)"
              [min]="minDate"
              aria-required="true"
              [attr.aria-describedby]="showError(step3.get('examDate')!) ? 'date-error' : null"
            />
            @if (showError(step3.get('examDate')!)) {
              <p id="date-error" class="text-xs text-accent" role="alert">
                {{ examDateError }}
              </p>
            }
          </div>

          <!-- Daily study hours -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label for="dailyHours" class="text-sm font-medium text-white/70">
                ⏱️ Daily study hours
              </label>
              <span
                class="font-heading font-bold text-primary text-lg"
                aria-live="polite"
              >
                {{ step3.get('dailyStudyHours')?.value }}h
              </span>
            </div>

            <input
              id="dailyHours"
              type="range"
              formControlName="dailyStudyHours"
              min="1"
              max="12"
              step="0.5"
              class="w-full h-2 rounded-full appearance-none cursor-pointer"
              style="accent-color: #FF6B35; background: linear-gradient(to right, #FF6B35 0%, #FF6B35 {{ hoursPercent() }}%, rgba(255,255,255,0.1) {{ hoursPercent() }}%, rgba(255,255,255,0.1) 100%)"
              [attr.aria-valuemin]="1"
              [attr.aria-valuemax]="12"
              [attr.aria-valuenow]="step3.get('dailyStudyHours')?.value"
              aria-label="Daily study hours"
            />

            <!-- Hour markers -->
            <div class="flex justify-between text-white/30 text-[10px] px-0.5">
              @for (mark of hourMarks; track mark) {
                <span>{{ mark }}h</span>
              }
            </div>

            <!-- Recommendation label -->
            <div
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              [style.background]="hoursRecommendation().color + '15'"
              [style.color]="hoursRecommendation().color"
              [style.borderColor]="hoursRecommendation().color + '30'"
              style="border-width: 1px; border-style: solid;"
            >
              <span aria-hidden="true">{{ hoursRecommendation().icon }}</span>
              <span>{{ hoursRecommendation().label }}</span>
            </div>
          </div>

          <!-- Days remaining preview -->
          @if (step3.get('examDate')?.value && !showError(step3.get('examDate')!)) {
            <div
              class="flex items-center gap-3 px-4 py-3 rounded-xl"
              style="background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.2);"
              aria-live="polite"
            >
              <span class="text-2xl" aria-hidden="true">🎯</span>
              <div class="flex flex-col">
                <span class="text-white font-medium text-sm">
                  {{ daysUntilExam() }} days to your exam
                </span>
                <span class="text-white/50 text-xs">
                  You'll study {{ totalStudyHours() }} hours total
                </span>
              </div>
            </div>
          }

          <div class="flex gap-3 mt-1">
            <button
              type="button"
              (click)="prevStep()"
              class="btn-secondary flex-1"
              [disabled]="isLoading()"
              aria-label="Go back to step 2"
            >
              ← Back
            </button>
            <button
              type="submit"
              class="btn-primary flex-1"
              [disabled]="isLoading()"
              aria-label="Create your account"
            >
              @if (isLoading()) {
                <span
                  class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  aria-hidden="true"
                ></span>
                <span>Creating…</span>
              } @else {
                <span>Create Account 🚀</span>
              }
            </button>
          </div>
        </form>
      }

      <!-- Login link -->
      <p class="text-center text-white/50 text-sm">
        Already have an account?
        <a
          routerLink="/auth/login"
          class="text-primary font-medium hover:text-primary/80 transition-colors ml-1"
        >
          Sign in
        </a>
      </p>

    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentStep = signal(1);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly selectedExam = signal<string | null>(null);
  protected readonly examError = signal(false);

  protected readonly examCards = EXAM_CARDS;
  protected readonly hourMarks = [1, 3, 5, 7, 9, 12];
  protected readonly minDate = new Date(Date.now() + 86400000)
    .toISOString()
    .split('T')[0];

  protected readonly stepLabels = [
    'Personal information',
    'Choose your target exam',
    'Set your study schedule',
  ];

  // ── Step 1 form ───────────────────────────────────────────────────────────

  protected readonly step1 = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/[0-9]/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  // ── Step 3 form ───────────────────────────────────────────────────────────

  protected readonly step3 = this.fb.group({
    examDate: ['', [Validators.required, futureDateValidator]],
    dailyStudyHours: [4, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  // ── Computed values ───────────────────────────────────────────────────────

  protected readonly hoursPercent = computed(() => {
    const hours = this.step3.get('dailyStudyHours')?.value ?? 4;
    return Math.round(((hours - 1) / (12 - 1)) * 100);
  });

  protected readonly hoursRecommendation = computed(() => {
    const h = this.step3.get('dailyStudyHours')?.value ?? 4;
    if (h < 2) return { icon: '😌', label: 'Light study — good for maintenance', color: '#06D6A0' };
    if (h <= 5) return { icon: '👍', label: 'Balanced study — recommended for most students', color: '#06D6A0' };
    if (h <= 8) return { icon: '💪', label: 'Intensive study — great for exam season', color: '#FFD166' };
    return { icon: '🔥', label: 'Extreme study — ensure adequate rest!', color: '#E94560' };
  });

  protected readonly daysUntilExam = computed(() => {
    const date = this.step3.get('examDate')?.value;
    if (!date) return 0;
    const diff = new Date(date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  });

  protected readonly totalStudyHours = computed(() => {
    const days = this.daysUntilExam();
    const hours = this.step3.get('dailyStudyHours')?.value ?? 4;
    return (days * hours).toLocaleString('en-IN');
  });

  protected readonly passwordHints = computed(() => {
    const pw = this.step1.get('password')?.value ?? '';
    return [
      { label: '8+ chars', met: pw.length >= 8 },
      { label: 'Uppercase', met: /[A-Z]/.test(pw) },
      { label: 'Number', met: /[0-9]/.test(pw) },
    ];
  });

  // ── Error getters ─────────────────────────────────────────────────────────

  protected get nameError(): string {
    const ctrl = this.step1.get('name')!;
    if (ctrl.hasError('required')) return 'Full name is required';
    if (ctrl.hasError('minlength')) return 'Name must be at least 2 characters';
    return '';
  }

  protected get emailError(): string {
    const ctrl = this.step1.get('email')!;
    if (ctrl.hasError('required')) return 'Email is required';
    if (ctrl.hasError('email')) return 'Please enter a valid email address';
    return '';
  }

  protected get passwordError(): string {
    const ctrl = this.step1.get('password')!;
    if (ctrl.hasError('required')) return 'Password is required';
    if (ctrl.hasError('minlength')) return 'Password must be at least 8 characters';
    if (ctrl.hasError('pattern')) return 'Must contain uppercase letter and number';
    return '';
  }

  protected get examDateError(): string {
    const ctrl = this.step3.get('examDate')!;
    if (ctrl.hasError('required')) return 'Please select your exam date';
    if (ctrl.hasError('pastDate')) return 'Exam date must be in the future';
    return '';
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  protected showError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && ctrl.touched;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  protected nextStep(): void {
    this.error.set(null);

    if (this.currentStep() === 1) {
      this.step1.markAllAsTouched();
      if (this.step1.invalid) return;
    }

    if (this.currentStep() === 2) {
      if (!this.selectedExam()) {
        this.examError.set(true);
        return;
      }
      this.examError.set(false);
    }

    if (this.currentStep() < 3) {
      this.currentStep.update((s) => s + 1);
    }
  }

  protected prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  protected selectExam(examId: string): void {
    this.selectedExam.set(examId);
    this.examError.set(false);
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  protected onSubmit(): void {
    this.step3.markAllAsTouched();
    if (this.step3.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { name, email, password, phone } = this.step1.value;
    const { examDate, dailyStudyHours } = this.step3.value;

    const payload: RegisterRequest = {
      name: name!.trim(),
      email: email!.trim(),
      password: password!,
      phone: `+91${phone!}`,
      targetExam: this.selectedExam() as RegisterRequest['targetExam'],
      examDate: examDate ?? undefined,
      dailyStudyHours: dailyStudyHours ?? 4,
    };

    this.auth
      .register(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Registration failed. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}
