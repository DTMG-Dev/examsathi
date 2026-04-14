import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TestService } from '../../../../core/services/test.service';
import { TestResult, SubjectBreakdown } from '../../../../core/models/test-session.model';
import { QuestionState } from '../../../../core/models/question.model';
import { QuestionsService } from '../../../../core/services/questions.service';
import { Exam, Difficulty } from '../../../../core/models/question.model';

const CIRCLE_RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ≈ 339.3

@Component({
  selector: 'app-test-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center min-h-96">
        <div class="ai-thinking"><span></span><span></span><span></span></div>
      </div>
    }

    @if (!isLoading() && result()) {
      <div class="flex flex-col gap-6 p-4 md:p-6 pb-10">

        <!-- Score circle + motivational message -->
        <div class="glass-card p-6 flex flex-col items-center gap-4 text-center">
          <svg width="140" height="140" viewBox="0 0 120 120" aria-label="Score ring">
            <!-- Track -->
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
            <!-- Progress ring -->
            <circle cx="60" cy="60" r="54" fill="none"
              stroke="url(#scoreGrad)" stroke-width="10"
              stroke-linecap="round"
              [attr.stroke-dasharray]="circumference"
              [style.stroke-dashoffset]="ringOffset()"
              [style.transition]="'stroke-dashoffset 1.4s ease-out'"
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#FF6B35"/>
                <stop offset="100%" stop-color="#E94560"/>
              </linearGradient>
            </defs>
            <!-- Percentage text -->
            <text x="60" y="55" text-anchor="middle" fill="white"
              font-family="Poppins,sans-serif" font-size="22" font-weight="700">
              {{ result()!.accuracy }}%
            </text>
            <text x="60" y="72" text-anchor="middle" fill="rgba(255,255,255,0.4)"
              font-family="Inter,sans-serif" font-size="10">
              Accuracy
            </text>
          </svg>

          <div class="flex flex-col gap-1">
            <h2 class="font-heading font-bold text-xl text-white">{{ motivationalMessage() }}</h2>
            <p class="text-white/40 text-sm">{{ result()!.exam }} · {{ result()!.subject }}</p>
          </div>
        </div>

        <!-- Stats row -->
        <div class="flex gap-3">
          @for (stat of stats(); track stat.label) {
            <div class="glass-card flex-1 flex flex-col items-center gap-1 py-4">
              <span class="text-xl font-bold" [style.color]="stat.colour">{{ stat.value }}</span>
              <span class="text-xs text-white/40">{{ stat.label }}</span>
            </div>
          }
        </div>

        <!-- Time taken -->
        <div class="glass-card p-4 flex items-center gap-3">
          <span class="text-2xl">⏱</span>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-white/40">Time Taken</span>
            <span class="font-semibold text-white">{{ formattedTime() }}</span>
          </div>
          <div class="ml-auto flex flex-col items-end gap-0.5">
            <span class="text-xs text-white/40">Avg per question</span>
            <span class="text-sm font-semibold text-white">{{ avgTime() }}s</span>
          </div>
        </div>

        <!-- Subject-wise breakdown -->
        @if (subjectEntries().length > 0) {
          <div class="glass-card p-5 flex flex-col gap-4">
            <p class="text-sm font-semibold text-white/60">Subject Performance</p>
            @for (entry of subjectEntries(); track entry.subject) {
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-white">{{ entry.subject }}</span>
                  <span class="font-bold" [style.color]="accuracyColour(entry.data.accuracy)">
                    {{ entry.data.accuracy }}%
                  </span>
                </div>
                <!-- Bar -->
                <div class="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-1000"
                    [style.width]="animateStats() ? entry.data.accuracy + '%' : '0%'"
                    [style.background]="accuracyColour(entry.data.accuracy)">
                  </div>
                </div>
                <div class="flex gap-3 text-xs text-white/40">
                  <span class="text-emerald-400">✓ {{ entry.data.correct }}</span>
                  <span class="text-red-400">✗ {{ entry.data.wrong }}</span>
                  <span>— {{ entry.data.total - entry.data.correct - entry.data.wrong }} skipped</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Action buttons -->
        <div class="flex flex-col gap-3">
          <button type="button" class="btn-primary py-3"
            (click)="viewSolutions()">
            📖 View Solutions
          </button>
          <button type="button" class="btn-secondary py-3"
            (click)="retryWeakAreas()">
            🎯 Retry Weak Areas
          </button>
          <div class="flex gap-3">
            <button type="button" class="btn-secondary flex-1 py-2.5 text-sm"
              (click)="shareScore()">
              📤 Share Score
            </button>
            <button type="button" class="btn-secondary flex-1 py-2.5 text-sm"
              (click)="goHome()">
              🏠 Dashboard
            </button>
          </div>
        </div>

      </div>
    }

    <!-- Share toast -->
    @if (showShareToast()) {
      <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium text-white"
        style="background: rgba(6,214,160,0.9);">
        Score copied to clipboard! 🎉
      </div>
    }
  `,
})
export class TestResultComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly testService = inject(TestService);
  private readonly questionsService = inject(QuestionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly result = signal<TestResult | null>(null);
  readonly questions = signal<QuestionState[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly animateStats = signal<boolean>(false);
  readonly showShareToast = signal<boolean>(false);

  readonly circumference = CIRCUMFERENCE;

  readonly ringOffset = computed(() => {
    if (!this.animateStats() || !this.result()) return CIRCUMFERENCE;
    return CIRCUMFERENCE * (1 - this.result()!.accuracy / 100);
  });

  readonly stats = computed(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Correct', value: r.correctCount, colour: '#06D6A0' },
      { label: 'Wrong', value: r.wrongCount, colour: '#EF476F' },
      { label: 'Skipped', value: r.skippedCount, colour: '#FFD166' },
      { label: 'Total', value: r.totalQuestions, colour: 'rgba(255,255,255,0.6)' },
    ];
  });

  readonly formattedTime = computed(() => {
    const s = this.result()?.timeTaken ?? 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  });

  readonly avgTime = computed(() => {
    const r = this.result();
    if (!r || !r.totalQuestions) return 0;
    return Math.round(r.timeTaken / r.totalQuestions);
  });

  readonly subjectEntries = computed<{ subject: string; data: SubjectBreakdown }[]>(() => {
    const bd = this.result()?.subjectBreakdown;
    if (!bd) return [];
    return Object.entries(bd).map(([subject, data]) => ({ subject, data }));
  });

  readonly motivationalMessage = computed(() => {
    const acc = this.result()?.accuracy ?? 0;
    if (acc >= 90) return 'Exceptional! You\'re exam-ready! 🏆';
    if (acc >= 75) return 'Great work! Keep this momentum! 🌟';
    if (acc >= 60) return 'Good effort! A few more revisions! 💪';
    if (acc >= 40) return 'Keep going! Focus on weak areas! 📚';
    return 'Every expert was a beginner. Keep practicing! 🚀';
  });

  ngOnInit(): void {
    const state = window.history.state as { result?: TestResult; questions?: QuestionState[] };
    const sessionId = this.route.snapshot.paramMap.get('sessionId');

    if (state?.result) {
      this.result.set(state.result);
      if (state.questions) this.questions.set(state.questions);
      this.isLoading.set(false);
      setTimeout(() => this.animateStats.set(true), 300);
    } else if (sessionId) {
      this.testService
        .getDetail(sessionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const s = res.data.session;
            this.result.set({
              sessionId: s._id,
              accuracy: s.accuracy,
              correctCount: s.correctCount,
              wrongCount: s.wrongCount,
              skippedCount: s.skippedCount,
              timeTaken: s.timeTaken,
              totalQuestions: s.totalQuestions,
              subjectBreakdown: s.subjectBreakdown,
              completedAt: s.completedAt ?? '',
              exam: s.exam,
              subject: s.subject,
              topics: s.topics,
              difficulty: s.difficulty,
            });
            this.isLoading.set(false);
            setTimeout(() => this.animateStats.set(true), 300);
          },
          error: () => {
            this.isLoading.set(false);
            this.router.navigate(['/tests']);
          },
        });
    } else {
      this.router.navigate(['/tests']);
    }
  }

  accuracyColour(accuracy: number): string {
    if (accuracy >= 70) return '#06D6A0';
    if (accuracy >= 40) return '#FFD166';
    return '#EF476F';
  }

  viewSolutions(): void {
    const sessionId = this.result()?.sessionId ?? this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) return;
    this.router.navigate(['/tests', 'review', sessionId], {
      state: { questions: this.questions() },
    });
  }

  retryWeakAreas(): void {
    const r = this.result();
    if (!r) return;
    // Navigate to question generator pre-filled with weak subject
    const weakSubject = this.subjectEntries().sort((a, b) => a.data.accuracy - b.data.accuracy)[0];
    this.router.navigate(['/tests', 'generate'], {
      state: {
        prefill: {
          exam: r.exam as Exam,
          subject: weakSubject?.subject ?? r.subject,
          difficulty: 'hard' as Difficulty,
        },
      },
    });
  }

  shareScore(): void {
    const r = this.result();
    if (!r) return;
    const text = `I scored ${r.accuracy}% on ${r.exam} ${r.subject} test! (${r.correctCount}/${r.totalQuestions} correct) — ExamSathi 📚`;
    navigator.clipboard.writeText(text).then(() => {
      this.showShareToast.set(true);
      setTimeout(() => this.showShareToast.set(false), 2500);
    });
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }
}
