import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TestService } from '../../../../core/services/test.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Question, AnswerOption } from '../../../../core/models/question.model';
import { StartPracticeResponse, WeakAreaSampled } from '../../../../core/models/weak-area.model';

type AnswerState = 'unanswered' | 'correct' | 'wrong';

interface QuestionRuntime {
  question: Question;
  selectedAnswer: AnswerOption | null;
  answerState: AnswerState;
  timeSpent: number;
  showExplanation: boolean;
}

// Encouragement messages shown after correct answers
const ENCOURAGEMENTS = [
  '🎯 Excellent! You\'re improving!',
  '🔥 Great job! Keep it up!',
  '⚡ Nailed it! One step closer to mastery!',
  '💪 Correct! You\'re getting stronger!',
  '🌟 Perfect! Practice makes permanent!',
];

@Component({
  selector: 'app-adaptive-test',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './adaptive-test.component.html',
  styleUrl: './adaptive-test.component.scss',
})
export class AdaptiveTestComponent implements OnInit {
  private readonly testService  = inject(TestService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);

  // ── Session data from router state ────────────────────────────────────────
  private sessionData: StartPracticeResponse | null = null;

  // ── Runtime state ─────────────────────────────────────────────────────────
  readonly questions     = signal<QuestionRuntime[]>([]);
  readonly currentIndex  = signal(0);
  readonly sessionId     = signal<string | null>(null);
  readonly weakAreasSampled = signal<WeakAreaSampled[]>([]);
  readonly isSubmitting  = signal(false);
  readonly isFinished    = signal(false);
  readonly sessionSeconds = signal(0);
  readonly encouragement = signal<string | null>(null);
  readonly isLoading     = signal(true);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly totalQuestions  = computed(() => this.questions().length);
  readonly answeredCount   = computed(() => this.questions().filter((q) => q.selectedAnswer !== null).length);
  readonly correctCount    = computed(() => this.questions().filter((q) => q.answerState === 'correct').length);
  readonly wrongCount      = computed(() => this.questions().filter((q) => q.answerState === 'wrong').length);
  readonly progressPct     = computed(() =>
    this.totalQuestions() > 0
      ? Math.round((this.answeredCount() / this.totalQuestions()) * 100)
      : 0,
  );
  readonly accuracy = computed(() =>
    this.answeredCount() > 0
      ? Math.round((this.correctCount() / this.answeredCount()) * 100)
      : 0,
  );

  readonly timerDisplay = computed(() => {
    const s = this.sessionSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  readonly allAnswered = computed(() =>
    this.answeredCount() === this.totalQuestions() && this.totalQuestions() > 0,
  );

  readonly hasNext = computed(() => this.currentIndex() < this.totalQuestions() - 1);
  readonly hasPrev = computed(() => this.currentIndex() > 0);

  // ── Options array for current question ───────────────────────────────────
  readonly optionKeys: AnswerOption[] = ['A', 'B', 'C', 'D'];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Read session data passed from weak-area-dashboard via router state
    const nav = this.router.getCurrentNavigation();
    this.sessionData = (nav?.extras?.state?.['session'] as StartPracticeResponse)
      ?? (history.state?.['session'] as StartPracticeResponse)
      ?? null;

    if (!this.sessionData) {
      this.toastService.error('No practice session found. Please start again.');
      this.router.navigate(['/weak-areas']);
      return;
    }

    this.sessionId.set(this.sessionData.sessionId);
    this.weakAreasSampled.set(this.sessionData.weakAreasSampled);

    const runtime: QuestionRuntime[] = this.sessionData.questions.map((q) => ({
      question: q,
      selectedAnswer: null,
      answerState: 'unanswered',
      timeSpent: 0,
      showExplanation: false,
    }));
    this.questions.set(runtime);
    this.isLoading.set(false);

    // Session timer
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isFinished()) {
          this.sessionSeconds.update((s) => s + 1);
          // increment current question's time
          this.questions.update((qs) => {
            const updated = [...qs];
            if (updated[this.currentIndex()]) {
              updated[this.currentIndex()] = {
                ...updated[this.currentIndex()],
                timeSpent: updated[this.currentIndex()].timeSpent + 1,
              };
            }
            return updated;
          });
        }
      });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  selectAnswer(option: AnswerOption): void {
    const current = this.currentQuestion();
    if (!current || current.selectedAnswer !== null) return; // already answered

    const isCorrect = option === current.question.correctAnswer;
    const answerState: AnswerState = isCorrect ? 'correct' : 'wrong';

    // Update local state immediately (optimistic)
    this.questions.update((qs) => {
      const updated = [...qs];
      updated[this.currentIndex()] = {
        ...current,
        selectedAnswer: option,
        answerState,
        showExplanation: !isCorrect, // show explanation immediately on wrong answer
      };
      return updated;
    });

    // Show encouragement on correct answer
    if (isCorrect) {
      this.encouragement.set(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      setTimeout(() => this.encouragement.set(null), 2000);
    }

    // Submit to backend (fire-and-forget per question)
    const sid = this.sessionId();
    if (sid) {
      this.testService
        .submitAnswer(sid, {
          questionId: current.question._id,
          selectedAnswer: option,
          timeTaken: current.timeSpent,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => {} }); // ignore errors — we have optimistic state
    }
  }

  toggleExplanation(): void {
    this.questions.update((qs) => {
      const updated = [...qs];
      const idx = this.currentIndex();
      updated[idx] = { ...updated[idx], showExplanation: !updated[idx].showExplanation };
      return updated;
    });
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.totalQuestions()) {
      this.currentIndex.set(index);
    }
  }

  next(): void { this.goTo(this.currentIndex() + 1); }
  prev(): void { this.goTo(this.currentIndex() - 1); }

  autoNext(): void {
    if (this.hasNext()) {
      setTimeout(() => this.next(), 800);
    }
  }

  finishSession(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const sid = this.sessionId();
    if (!sid) { this.isSubmitting.set(false); return; }

    this.testService
      .finishTest(sid, { totalTimeTaken: this.sessionSeconds() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.isFinished.set(true);
          if (res.success) {
            this.router.navigate(['/test-engine/result', sid]);
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Failed to submit session. Please try again.');
        },
      });
  }

  exitSession(): void {
    this.router.navigate(['/weak-areas']);
  }

  getOptionClass(q: QuestionRuntime, option: AnswerOption): string {
    if (q.selectedAnswer === null) return '';
    if (option === q.question.correctAnswer) return 'correct';
    if (option === q.selectedAnswer) return 'wrong';
    return '';
  }

  getOptionLabel(option: AnswerOption): string {
    const current = this.currentQuestion();
    if (!current) return '';
    const opts = current.question.options;
    const found = opts.find((o) => o.id === option);
    return found?.text ?? '';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = { critical: '#ef4444', moderate: '#f97316', good: '#22c55e' };
    return colors[priority] ?? '#fff';
  }
}
