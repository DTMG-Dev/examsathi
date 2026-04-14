import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TestService } from '../../../../core/services/test.service';
import { QuestionCardComponent } from '../../../../shared/components/question-card/question-card.component';
import { Question, QuestionState, AnswerOption } from '../../../../core/models/question.model';
import { TestResult } from '../../../../core/models/test-session.model';

type QuestionStatus = 'unseen' | 'answered' | 'marked' | 'answered-marked';

@Component({
  selector: 'app-test-screen',
  standalone: true,
  imports: [QuestionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Loading state -->
    @if (isLoading()) {
      <div class="flex flex-col items-center justify-center min-h-96 gap-4">
        <div class="ai-thinking"><span></span><span></span><span></span></div>
        <p class="text-white/40 text-sm">Setting up your test session…</p>
      </div>
    }

    @if (!isLoading()) {
      <!-- ── Top bar ──────────────────────────────────────────────────────── -->
      <div class="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10"
        style="background: rgba(15,15,26,0.95); backdrop-filter: blur(8px);">

        <!-- Timer -->
        <div class="flex items-center gap-2 min-w-20">
          <span class="text-base">⏱</span>
          <span class="font-mono font-bold text-lg transition-colors"
            [class.text-red-400]="timerDanger()"
            [class.text-white]="!timerDanger()"
          >{{ timerDisplay() }}</span>
        </div>

        <!-- Progress -->
        <div class="flex flex-col items-center gap-0.5">
          <span class="text-xs text-white/40">Question</span>
          <span class="font-bold text-white text-sm">
            {{ currentIndex() + 1 }} / {{ totalQuestions() }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Font size toggle -->
          <button type="button"
            class="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-bold"
            (click)="cycleFontSize()" [attr.aria-label]="'Font size: ' + fontSize()">
            A{{ fontSize() === 'sm' ? '₁' : fontSize() === 'base' ? '₂' : '₃' }}
          </button>

          <!-- Grid toggle (mobile) -->
          <button type="button"
            class="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            (click)="showGrid.set(!showGrid())" aria-label="Toggle question grid">
            ⊞
          </button>

          <!-- Submit -->
          <button type="button" class="btn-primary py-2 px-4 text-sm"
            (click)="confirmSubmit()" [disabled]="isSubmitting()">
            Submit
          </button>
        </div>
      </div>

      <!-- ── Body ────────────────────────────────────────────────────────── -->
      <div class="flex w-full">

        <!-- Left sidebar: question grid (desktop) -->
        <aside class="hidden lg:flex flex-col gap-4 w-64 shrink-0 p-4 sticky top-16 self-start max-h-[calc(100vh-64px)] overflow-y-auto">
          <p class="text-xs font-semibold text-white/40 uppercase tracking-wider">Questions</p>

          <!-- Legend -->
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            @for (item of LEGEND; track item.label) {
              <div class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-sm" [style.background]="item.colour"></span>
                <span class="text-xs text-white/40">{{ item.label }}</span>
              </div>
            }
          </div>

          <!-- Grid -->
          <div class="flex flex-wrap gap-2">
            @for (q of questions(); track q._id; let i = $index) {
              <button type="button"
                class="w-9 h-9 rounded-lg text-xs font-bold transition-all duration-150 relative"
                [style]="gridButtonStyle(i)"
                (click)="navigateTo(i)"
                [attr.aria-label]="'Question ' + (i + 1)">
                {{ i + 1 }}
                @if (q.isBookmarked) {
                  <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400"></span>
                }
              </button>
            }
          </div>

          <!-- Stats -->
          <div class="glass-card p-3 flex flex-col gap-2 text-xs">
            <div class="flex justify-between">
              <span class="text-white/40">Answered</span>
              <span class="text-primary font-bold">{{ answeredCount() }}/{{ totalQuestions() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">Marked</span>
              <span class="text-yellow-400 font-bold">{{ markedCount() }}</span>
            </div>
          </div>
        </aside>

        <!-- Main content -->
        <main class="flex-1 flex flex-col gap-4 p-4 min-w-0"
          [class.text-sm]="fontSize() === 'sm'"
          [class.text-base]="fontSize() === 'base'"
          [class.text-lg]="fontSize() === 'lg'">

          @if (currentQuestion(); as q) {
            <app-question-card
              [question]="q"
              [questionNumber]="currentIndex() + 1"
              [showAnswer]="false"
              [showTimer]="false"
              (answerSelected)="onAnswer($event)"
              (bookmarkToggled)="onBookmark()"
            />
          }

          <!-- Bottom navigation -->
          <div class="flex items-center gap-3 py-2">
            <button type="button" class="btn-secondary px-4 py-2 text-sm"
              (click)="navigate(-1)" [disabled]="currentIndex() === 0">
              ← Prev
            </button>

            <button type="button"
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
              [style.border-color]="currentQuestion()?.isBookmarked ? '#FFD166' : 'rgba(255,255,255,0.15)'"
              [style.background]="currentQuestion()?.isBookmarked ? 'rgba(255,209,102,0.1)' : 'transparent'"
              [style.color]="currentQuestion()?.isBookmarked ? '#FFD166' : 'rgba(255,255,255,0.6)'"
              (click)="onBookmark()">
              {{ currentQuestion()?.isBookmarked ? '🔖 Marked' : '📌 Mark for Review' }}
            </button>

            <button type="button" class="btn-secondary px-4 py-2 text-sm"
              (click)="navigate(1)" [disabled]="currentIndex() === totalQuestions() - 1">
              Next →
            </button>
          </div>
        </main>
      </div>

      <!-- ── Mobile: grid overlay ───────────────────────────────────────── -->
      @if (showGrid()) {
        <div class="lg:hidden fixed inset-0 z-40 flex flex-col justify-end"
          style="background: rgba(0,0,0,0.6);"
          (click)="showGrid.set(false)">
          <div class="flex flex-col gap-4 p-5 rounded-t-2xl"
            style="background: #1E1E32;"
            (click)="$event.stopPropagation()">
            <div class="w-10 h-1 rounded-full bg-white/20 mx-auto"></div>
            <p class="text-sm font-semibold text-white/60">Question Navigator</p>
            <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              @for (q of questions(); track q._id; let i = $index) {
                <button type="button"
                  class="w-9 h-9 rounded-lg text-xs font-bold transition-all relative"
                  [style]="gridButtonStyle(i)"
                  (click)="navigateTo(i)">
                  {{ i + 1 }}
                  @if (q.isBookmarked) {
                    <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400"></span>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Submit confirmation modal ──────────────────────────────────── -->
      @if (showSubmitModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.7);">
          <div class="glass-card p-6 max-w-sm w-full flex flex-col gap-5">
            <div class="flex flex-col gap-1">
              <h3 class="font-heading font-bold text-white text-lg">Submit Test?</h3>
              <p class="text-white/50 text-sm">
                You have
                <span class="text-white font-semibold">{{ unansweredCount() }} unanswered</span>
                @if (markedCount() > 0) {
                  and <span class="text-yellow-400 font-semibold">{{ markedCount() }} marked</span>
                }
                question{{ unansweredCount() !== 1 ? 's' : '' }}.
              </p>
            </div>
            <div class="flex gap-3">
              <button type="button" class="btn-secondary flex-1 py-2.5 text-sm"
                (click)="cancelSubmit()" [disabled]="isSubmitting()">
                Review
              </button>
              <button type="button" class="btn-primary flex-1 py-2.5 text-sm"
                (click)="doFinish()" [disabled]="isSubmitting()">
                @if (isSubmitting()) {
                  <span class="ai-thinking"><span></span><span></span><span></span></span>
                } @else {
                  Submit Test
                }
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class TestScreenComponent implements OnInit {
  private readonly testService = inject(TestService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly questions = signal<QuestionState[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly sessionId = signal<string | null>(null);
  readonly timeRemaining = signal<number>(0);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly showSubmitModal = signal<boolean>(false);
  readonly showGrid = signal<boolean>(false);
  readonly fontSize = signal<'sm' | 'base' | 'lg'>('base');
  private questionStartTime = Date.now();

  readonly currentQuestion = computed<QuestionState | undefined>(
    () => this.questions()[this.currentIndex()],
  );
  readonly totalQuestions = computed(() => this.questions().length);
  readonly answeredCount = computed(
    () => this.questions().filter((q) => q.selectedAnswer !== null).length,
  );
  readonly unansweredCount = computed(() => this.totalQuestions() - this.answeredCount());
  readonly markedCount = computed(() => this.questions().filter((q) => q.isBookmarked).length);

  readonly timerDisplay = computed(() => {
    const s = this.timeRemaining();
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
  readonly timerDanger = computed(() => this.timeRemaining() <= 60 && this.timeRemaining() > 0);

  readonly LEGEND = [
    { label: 'Answered', colour: 'rgba(255,107,53,0.7)' },
    { label: 'Marked', colour: '#FFD166' },
    { label: 'Unseen', colour: 'rgba(255,255,255,0.1)' },
  ];

  ngOnInit(): void {
    const state = window.history.state as {
      questions?: Question[];
      exam?: string;
      subject?: string;
      topic?: string;
      difficulty?: string;
    };

    if (!state?.questions?.length) {
      this.router.navigate(['/tests']);
      return;
    }

    this.testService
      .startTest({
        questionIds: state.questions.map((q) => q._id),
        exam: state.exam ?? state.questions[0].exam,
        subject: state.subject ?? state.questions[0].subject,
        topic: state.topic ?? state.questions[0].topic,
        difficulty: state.difficulty ?? 'mixed',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.questions.set(
            res.data.questions.map((q) => ({
              ...q,
              selectedAnswer: null,
              isBookmarked: false,
              isAnswered: false,
              timeSpentSeconds: 0,
            })),
          );
          this.sessionId.set(String(res.data.sessionId));
          this.timeRemaining.set(res.data.totalQuestions * 90); // 90s per question
          this.isLoading.set(false);
          this.startTimer();
        },
        error: () => {
          this.isLoading.set(false);
          this.router.navigate(['/tests']);
        },
      });
  }

  private startTimer(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const t = this.timeRemaining();
        if (t <= 1) {
          this.timeRemaining.set(0);
          this.doFinish(); // auto-submit
        } else {
          this.timeRemaining.update((v) => v - 1);
        }
      });
  }

  gridButtonStyle(index: number): string {
    const q = this.questions()[index];
    const isCurrent = index === this.currentIndex();
    const border = isCurrent ? '2px solid #FF6B35' : '2px solid transparent';

    if (q?.selectedAnswer && q?.isBookmarked) {
      return `background: rgba(255,209,102,0.3); color: #FFD166; border: ${border};`;
    }
    if (q?.isBookmarked) {
      return `background: rgba(255,209,102,0.15); color: #FFD166; border: ${border};`;
    }
    if (q?.selectedAnswer) {
      return `background: rgba(255,107,53,0.3); color: #FF6B35; border: ${border};`;
    }
    return `background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); border: ${border};`;
  }

  onAnswer(answer: AnswerOption): void {
    const idx = this.currentIndex();
    const sessionId = this.sessionId();
    if (!sessionId) return;

    const timeTaken = Math.round((Date.now() - this.questionStartTime) / 1000);
    const qId = this.questions()[idx]._id;

    this.questions.update((qs) =>
      qs.map((q, i) =>
        i === idx ? { ...q, selectedAnswer: answer, timeSpentSeconds: timeTaken } : q,
      ),
    );

    // Fire-and-forget — don't block UI on server round-trip
    this.testService
      .submitAnswer(sessionId, { questionId: qId, selectedAnswer: answer, timeTaken })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  onBookmark(): void {
    const idx = this.currentIndex();
    this.questions.update((qs) =>
      qs.map((q, i) => (i === idx ? { ...q, isBookmarked: !q.isBookmarked } : q)),
    );
  }

  navigate(dir: 1 | -1): void {
    const next = this.currentIndex() + dir;
    if (next >= 0 && next < this.totalQuestions()) {
      this.questionStartTime = Date.now();
      this.currentIndex.set(next);
    }
  }

  navigateTo(index: number): void {
    if (index >= 0 && index < this.totalQuestions()) {
      this.questionStartTime = Date.now();
      this.currentIndex.set(index);
      this.showGrid.set(false);
    }
  }

  cycleFontSize(): void {
    const order: ('sm' | 'base' | 'lg')[] = ['sm', 'base', 'lg'];
    const next = (order.indexOf(this.fontSize()) + 1) % order.length;
    this.fontSize.set(order[next]);
  }

  confirmSubmit(): void {
    this.showSubmitModal.set(true);
  }

  cancelSubmit(): void {
    this.showSubmitModal.set(false);
  }

  doFinish(): void {
    this.showSubmitModal.set(false);
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const sessionId = this.sessionId();
    if (!sessionId) return;

    const totalTimeTaken = this.questions().reduce((sum, q) => sum + q.timeSpentSeconds, 0);

    this.testService
      .finishTest(sessionId, { totalTimeTaken })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.router.navigate(['/tests', 'result', sessionId], {
            state: { result: res.data as TestResult, questions: this.questions() },
          });
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
