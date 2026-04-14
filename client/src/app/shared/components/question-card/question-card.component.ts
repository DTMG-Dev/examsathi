import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { QuestionState, AnswerOption } from '../../../core/models/question.model';

@Component({
  selector: 'app-question-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="glass-card flex flex-col gap-5 p-5">

      <!-- ── Card header ──────────────────────────────────────────────────── -->
      <div class="flex items-start justify-between gap-3">
        <!-- Question number + difficulty badge -->
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0"
            style="background: linear-gradient(135deg, #FF6B35, #E94560);"
          >{{ questionNumber() }}</span>

          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
            [class.text-emerald-400]="question().difficulty === 'easy'"
            [class.bg-emerald-400]="question().difficulty === 'easy'"
            [class.text-yellow-400]="question().difficulty === 'medium'"
            [class.bg-yellow-400]="question().difficulty === 'medium'"
            [class.text-red-400]="question().difficulty === 'hard'"
            [class.bg-red-400]="question().difficulty === 'hard'"
            style="background-opacity: 0.12;"
            [style.background]="difficultyBg()"
            [style.color]="difficultyColour()"
          >{{ question().difficulty }}</span>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1">
          <!-- Timer -->
          @if (showTimer()) {
            <div class="flex items-center gap-1 text-xs text-white/40 mr-2">
              <span>⏱</span>
              <span>{{ formattedTime() }}</span>
            </div>
          }

          <!-- Bookmark -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200"
            [style.background]="question().isBookmarked ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)'"
            (click)="onBookmark()"
            [attr.aria-label]="question().isBookmarked ? 'Remove bookmark' : 'Bookmark question'"
            [attr.aria-pressed]="question().isBookmarked"
          >
            <span class="text-base">{{ question().isBookmarked ? '🔖' : '📄' }}</span>
          </button>

          <!-- Report issue -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-all duration-200"
            (click)="onReport()"
            aria-label="Report an issue with this question"
          >
            <span class="text-base opacity-40 hover:opacity-70">⚑</span>
          </button>
        </div>
      </div>

      <!-- ── Question text ─────────────────────────────────────────────────── -->
      <p class="text-white text-base leading-relaxed font-medium">
        {{ question().questionText }}
      </p>

      <!-- ── Options ──────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        @for (opt of question().options; track opt.id) {
          <button
            type="button"
            class="flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 w-full cursor-pointer"
            [class.cursor-not-allowed]="question().isAnswered && !showAnswer()"
            [style]="optionStyle(opt.id)"
            (click)="onAnswer(opt.id)"
            [disabled]="question().isAnswered && !showAnswer()"
            [attr.aria-pressed]="question().selectedAnswer === opt.id"
            [attr.aria-label]="'Option ' + opt.id + ': ' + opt.text"
          >
            <!-- Option letter badge -->
            <span
              class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all duration-200"
              [style]="optionBadgeStyle(opt.id)"
            >{{ opt.id }}</span>

            <!-- Option text -->
            <span class="text-sm leading-relaxed flex-1"
              [class.text-white]="!isWrongAnswer(opt.id)"
              [class.text-white]="!question().isAnswered"
              [style.opacity]="isWrongAnswer(opt.id) ? '0.4' : '1'"
            >{{ opt.text }}</span>

            <!-- Correct / wrong indicator (only when revealed) -->
            @if (showAnswer() && question().isAnswered) {
              @if (opt.id === question().correctAnswer) {
                <span class="text-emerald-400 text-lg shrink-0" aria-label="Correct answer">✓</span>
              } @else if (opt.id === question().selectedAnswer) {
                <span class="text-red-400 text-lg shrink-0" aria-label="Wrong answer">✗</span>
              }
            }
          </button>
        }
      </div>

      <!-- ── Explanation (shown after answer revealed) ─────────────────────── -->
      @if (showAnswer() && question().isAnswered && question().explanation) {
        <div
          class="flex flex-col gap-2 rounded-xl p-4"
          style="background: rgba(6,214,160,0.06); border: 1px solid rgba(6,214,160,0.2);"
          role="region"
          aria-label="Explanation"
        >
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 font-semibold text-sm">💡 Explanation</span>
          </div>
          <p class="text-white/70 text-sm leading-relaxed">{{ question().explanation }}</p>
        </div>
      }

      <!-- ── Tags ──────────────────────────────────────────────────────────── -->
      @if (question().tags.length > 0) {
        <div class="flex flex-wrap gap-1.5">
          @for (tag of question().tags; track tag) {
            <span class="text-xs px-2 py-0.5 rounded-full text-white/30"
              style="background: rgba(255,255,255,0.05);"
            >#{{ tag }}</span>
          }
        </div>
      }

    </div>
  `,
})
export class QuestionCardComponent {
  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly question = input.required<QuestionState>();
  readonly questionNumber = input<number>(1);
  readonly showAnswer = input<boolean>(false);
  readonly showTimer = input<boolean>(false);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly answerSelected = output<AnswerOption>();
  readonly bookmarkToggled = output<void>();
  readonly reportIssue = output<void>();

  // ── Computed styles ───────────────────────────────────────────────────────
  readonly difficultyColour = computed(() => {
    switch (this.question().difficulty) {
      case 'easy': return '#06D6A0';
      case 'medium': return '#FFD166';
      case 'hard': return '#EF476F';
    }
  });

  readonly difficultyBg = computed(() => {
    switch (this.question().difficulty) {
      case 'easy': return 'rgba(6,214,160,0.12)';
      case 'medium': return 'rgba(255,209,102,0.12)';
      case 'hard': return 'rgba(239,71,111,0.12)';
    }
  });

  readonly formattedTime = computed(() => {
    const secs = this.question().timeSpentSeconds;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // ── Option styling helpers ────────────────────────────────────────────────
  optionStyle(id: AnswerOption): string {
    const q = this.question();
    const isSelected = q.selectedAnswer === id;
    const isCorrect = id === q.correctAnswer;
    const isAnswered = q.isAnswered;
    const reveal = this.showAnswer();

    if (reveal && isAnswered) {
      if (isCorrect) {
        return 'background: rgba(6,214,160,0.1); border-color: rgba(6,214,160,0.5);';
      }
      if (isSelected && !isCorrect) {
        return 'background: rgba(239,71,111,0.1); border-color: rgba(239,71,111,0.4);';
      }
      return 'background: transparent; border-color: rgba(255,255,255,0.06);';
    }

    if (isSelected) {
      return 'background: rgba(255,107,53,0.1); border-color: rgba(255,107,53,0.5);';
    }
    return 'background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08);';
  }

  optionBadgeStyle(id: AnswerOption): string {
    const q = this.question();
    const isSelected = q.selectedAnswer === id;
    const isCorrect = id === q.correctAnswer;
    const reveal = this.showAnswer() && q.isAnswered;

    if (reveal && isCorrect) {
      return 'background: #06D6A0; color: #0F0F1A;';
    }
    if (reveal && isSelected && !isCorrect) {
      return 'background: rgba(239,71,111,0.25); color: #EF476F;';
    }
    if (isSelected) {
      return 'background: #FF6B35; color: white;';
    }
    return 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);';
  }

  isWrongAnswer(id: AnswerOption): boolean {
    const q = this.question();
    return (
      this.showAnswer() &&
      q.isAnswered &&
      id !== q.correctAnswer &&
      id === q.selectedAnswer
    );
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  onAnswer(id: AnswerOption): void {
    if (this.question().isAnswered && !this.showAnswer()) return;
    this.answerSelected.emit(id);
  }

  onBookmark(): void {
    this.bookmarkToggled.emit();
  }

  onReport(): void {
    this.reportIssue.emit();
  }
}
