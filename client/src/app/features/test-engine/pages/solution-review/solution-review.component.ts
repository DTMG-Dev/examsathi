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
import { QuestionCardComponent } from '../../../../shared/components/question-card/question-card.component';
import { QuestionState, AnswerOption } from '../../../../core/models/question.model';
import { DetailedAttempt } from '../../../../core/models/test-session.model';

type Feedback = 'got-it' | 'confused' | null;

interface ReviewState extends QuestionState {
  isSkipped: boolean;
  isCorrect: boolean;
  feedback: Feedback;
}

@Component({
  selector: 'app-solution-review',
  standalone: true,
  imports: [QuestionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center min-h-96">
        <div class="ai-thinking"><span></span><span></span><span></span></div>
      </div>
    }

    @if (!isLoading()) {
      <div class="flex flex-col gap-6 p-4 md:p-6 pb-10">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col gap-0.5">
            <h1 class="font-heading font-bold text-xl text-white">Solution Review</h1>
            <p class="text-white/40 text-sm">{{ reviewItems().length }} questions · tap to see explanation</p>
          </div>
          <button type="button" class="btn-secondary py-2 px-4 text-sm"
            (click)="goBack()">← Back</button>
        </div>

        <!-- Filter tabs -->
        <div class="flex gap-2">
          @for (tab of FILTER_TABS; track tab.value) {
            <button type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              [style.background]="activeFilter() === tab.value ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)'"
              [style.color]="activeFilter() === tab.value ? '#FF6B35' : 'rgba(255,255,255,0.5)'"
              [style.border]="activeFilter() === tab.value ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent'"
              (click)="activeFilter.set(tab.value)">
              {{ tab.label }} ({{ tab.count() }})
            </button>
          }
        </div>

        <!-- Summary chips -->
        <div class="flex gap-3 text-sm">
          <span class="px-3 py-1 rounded-full text-emerald-400" style="background: rgba(6,214,160,0.1);">
            ✓ {{ correctCount() }} correct
          </span>
          <span class="px-3 py-1 rounded-full text-red-400" style="background: rgba(239,71,111,0.1);">
            ✗ {{ wrongCount() }} wrong
          </span>
          <span class="px-3 py-1 rounded-full text-white/40" style="background: rgba(255,255,255,0.05);">
            — {{ skippedCount() }} skipped
          </span>
        </div>

        <!-- Question list -->
        @for (item of filteredItems(); track item._id; let i = $index) {
          <div class="flex flex-col gap-3">
            <!-- Status badge row -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                [style]="statusBadgeStyle(item)">
                {{ statusLabel(item) }}
              </span>
              @if (item.timeSpentSeconds > 0) {
                <span class="text-xs text-white/30">⏱ {{ item.timeSpentSeconds }}s</span>
              }
            </div>

            <!-- Question card (answers revealed) -->
            <app-question-card
              [question]="item"
              [questionNumber]="globalIndex(item)"
              [showAnswer]="true"
              (answerSelected)="$event"
            />

            <!-- Feedback buttons -->
            @if (!item.isSkipped) {
              <div class="flex gap-3">
                <button type="button"
                  class="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
                  [style.border-color]="item.feedback === 'got-it' ? 'rgba(6,214,160,0.5)' : 'rgba(255,255,255,0.1)'"
                  [style.background]="item.feedback === 'got-it' ? 'rgba(6,214,160,0.1)' : 'transparent'"
                  [style.color]="item.feedback === 'got-it' ? '#06D6A0' : 'rgba(255,255,255,0.5)'"
                  (click)="setFeedback(item._id, 'got-it')">
                  ✓ Got it!
                </button>
                <button type="button"
                  class="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
                  [style.border-color]="item.feedback === 'confused' ? 'rgba(239,71,111,0.5)' : 'rgba(255,255,255,0.1)'"
                  [style.background]="item.feedback === 'confused' ? 'rgba(239,71,111,0.1)' : 'transparent'"
                  [style.color]="item.feedback === 'confused' ? '#EF476F' : 'rgba(255,255,255,0.5)'"
                  (click)="setFeedback(item._id, 'confused')">
                  🤔 Still confused
                </button>
              </div>
            }

            <!-- Doubt solver (shown when confused) -->
            @if (item.feedback === 'confused') {
              <div class="glass-card p-4 flex flex-col gap-3"
                style="border-color: rgba(239,71,111,0.2); background: rgba(239,71,111,0.04);">
                <p class="text-sm font-semibold text-red-400">Need more help?</p>
                <p class="text-xs text-white/50">
                  Type your specific doubt and our AI will solve it step by step.
                </p>
                <div class="flex gap-2">
                  <input type="text" class="input-field text-sm flex-1 py-2"
                    placeholder="What exactly confused you?"
                    [value]="doubtText()[item._id] ?? ''"
                    (input)="setDoubt(item._id, $any($event.target).value)"/>
                  <button type="button" class="btn-primary px-4 py-2 text-sm shrink-0"
                    (click)="askDoubt(item)">
                    Ask AI
                  </button>
                </div>
              </div>
            }
          </div>
        }

        @if (filteredItems().length === 0) {
          <div class="empty-state py-12">
            <span class="text-4xl">🎯</span>
            <p class="text-white/50">No questions in this category</p>
          </div>
        }

      </div>
    }
  `,
})
export class SolutionReviewComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly testService = inject(TestService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reviewItems = signal<ReviewState[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly activeFilter = signal<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  readonly doubtText = signal<Record<string, string>>({});

  readonly correctCount = computed(() => this.reviewItems().filter((q) => q.isCorrect).length);
  readonly wrongCount = computed(
    () => this.reviewItems().filter((q) => !q.isCorrect && !q.isSkipped).length,
  );
  readonly skippedCount = computed(() => this.reviewItems().filter((q) => q.isSkipped).length);

  readonly FILTER_TABS = [
    { value: 'all' as const, label: 'All', count: () => this.reviewItems().length },
    { value: 'correct' as const, label: '✓ Correct', count: () => this.correctCount() },
    { value: 'wrong' as const, label: '✗ Wrong', count: () => this.wrongCount() },
    { value: 'skipped' as const, label: '— Skipped', count: () => this.skippedCount() },
  ];

  readonly filteredItems = computed(() => {
    const f = this.activeFilter();
    const items = this.reviewItems();
    if (f === 'correct') return items.filter((q) => q.isCorrect);
    if (f === 'wrong') return items.filter((q) => !q.isCorrect && !q.isSkipped);
    if (f === 'skipped') return items.filter((q) => q.isSkipped);
    return items;
  });

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    const state = window.history.state as { questions?: QuestionState[] };

    if (state?.questions?.length) {
      // Questions already in state (came from test-screen via result page)
      this.reviewItems.set(
        state.questions.map((q) => ({
          ...q,
          isAnswered: true,
          isSkipped: !q.selectedAnswer,
          isCorrect: q.selectedAnswer === q.correctAnswer,
          feedback: null,
        })),
      );
      this.isLoading.set(false);
    } else if (sessionId) {
      this.testService
        .getDetail(sessionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const items: ReviewState[] = res.data.session.questions
              .filter((a): a is DetailedAttempt & { question: NonNullable<DetailedAttempt['question']> } =>
                a.question !== null,
              )
              .map((a) => ({
                ...a.question,
                selectedAnswer: a.selectedAnswer as AnswerOption | null,
                isBookmarked: false,
                isAnswered: true,
                isSkipped: a.isSkipped,
                isCorrect: a.isCorrect,
                timeSpentSeconds: a.timeTaken,
                feedback: null,
              }));
            this.reviewItems.set(items);
            this.isLoading.set(false);
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

  statusLabel(item: ReviewState): string {
    if (item.isSkipped) return 'Skipped';
    return item.isCorrect ? 'Correct' : 'Wrong';
  }

  statusBadgeStyle(item: ReviewState): string {
    if (item.isSkipped) return 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4);';
    if (item.isCorrect) return 'background: rgba(6,214,160,0.15); color: #06D6A0;';
    return 'background: rgba(239,71,111,0.15); color: #EF476F;';
  }

  globalIndex(item: ReviewState): number {
    return this.reviewItems().findIndex((q) => q._id === item._id) + 1;
  }

  setFeedback(id: string, fb: Feedback): void {
    this.reviewItems.update((items) =>
      items.map((q) => (q._id === id ? { ...q, feedback: fb } : q)),
    );
  }

  setDoubt(id: string, text: string): void {
    this.doubtText.update((d) => ({ ...d, [id]: text }));
  }

  askDoubt(item: ReviewState): void {
    // Navigate to doubt solver (future feature) — for now just log intent
    const text = this.doubtText()[item._id];
    if (!text?.trim()) return;
    // TODO: call claudeService.solveDoubt when doubt solver page exists
    alert(`Doubt submitted: "${text}"\n\n(AI Doubt Solver coming soon!)`);
  }

  goBack(): void {
    this.router.navigate(['/tests']);
  }
}
