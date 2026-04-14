import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupsService } from '../../../../core/services/groups.service';
import { QuestionsService } from '../../../../core/services/questions.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { QuestionsListResponse } from '../../../../core/models/question.model';
import {
  Challenge,
  SubmitChallengeResponse,
} from '../../../../core/models/study-group.model';

interface QuestionAnswer {
  questionId:     string;
  selectedAnswer: string | null;
}

interface LiveQuestion {
  _id:         string;
  text:        string;
  options:     { label: string; text: string }[];
  subject:     string;
  topic:       string;
  difficulty:  string;
}

@Component({
  selector: 'app-challenge-screen',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './challenge-screen.component.html',
  styleUrl: './challenge-screen.component.scss',
})
export class ChallengeScreenComponent implements OnInit, OnDestroy {
  private readonly groupsService     = inject(GroupsService);
  private readonly questionsService  = inject(QuestionsService);
  private readonly toastService      = inject(ToastService);
  private readonly router            = inject(Router);
  private readonly route             = inject(ActivatedRoute);
  private readonly destroyRef        = inject(DestroyRef);

  // ── Route params ───────────────────────────────────────────────────────────
  readonly groupId     = signal('');
  readonly challengeId = signal('');

  // ── Challenge data (passed via router state) ───────────────────────────────
  readonly challenge   = signal<Challenge | null>(null);
  readonly groupName   = signal('');

  // ── Questions ──────────────────────────────────────────────────────────────
  readonly questions   = signal<LiveQuestion[]>([]);
  readonly answers     = signal<QuestionAnswer[]>([]);
  readonly isLoading   = signal(true);

  // ── UI State ───────────────────────────────────────────────────────────────
  readonly currentIdx     = signal(0);
  readonly isSubmitting   = signal(false);
  readonly submitted      = signal(false);
  readonly result         = signal<SubmitChallengeResponse | null>(null);

  // Timer
  readonly elapsedSecs    = signal(0);
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly currentQuestion = computed(() => this.questions()[this.currentIdx()] ?? null);

  readonly currentAnswer = computed(() =>
    this.answers().find((a) => a.questionId === this.currentQuestion()?._id)?.selectedAnswer ?? null,
  );

  readonly progress = computed(() => {
    const total = this.questions().length;
    if (!total) return 0;
    const answered = this.answers().filter((a) => a.selectedAnswer !== null).length;
    return Math.round((answered / total) * 100);
  });

  readonly answeredCount = computed(() =>
    this.answers().filter((a) => a.selectedAnswer !== null).length,
  );

  readonly elapsedDisplay = computed(() => {
    const s = this.elapsedSecs();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  readonly timeLeft = computed(() => {
    const c = this.challenge();
    if (!c) return '';
    const diff = new Date(c.dueDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.groupId.set(this.route.snapshot.paramMap.get('groupId') ?? '');
    this.challengeId.set(this.route.snapshot.paramMap.get('cId') ?? '');

    // Load challenge + group name from router state
    const state = history.state as { challenge?: Challenge; groupName?: string };
    if (state?.challenge) {
      this.challenge.set(state.challenge);
      this.groupName.set(state.groupName ?? '');
      this.loadQuestions(state.challenge);
    } else {
      // No state — go back
      this.toastService.error('Challenge data not found.');
      this.router.navigate(['/study-groups', this.groupId()]);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private loadQuestions(c: Challenge): void {
    // Fetch questions matching subject/topic/difficulty from the questions service
    this.questionsService
      .list({
        subject:    c.subject,
        topic:      c.topic,
        difficulty: c.difficulty,
        limit:      c.questionCount,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: { success: boolean; data: QuestionsListResponse }) => {
          if (res.success) {
            const qs = (res.data.questions ?? []) as unknown as LiveQuestion[];
            this.questions.set(qs);
            this.answers.set(qs.map((q) => ({ questionId: q._id, selectedAnswer: null })));
          }
          this.isLoading.set(false);
          this.startTimer();
        },
        error: () => {
          this.isLoading.set(false);
          // Use placeholder questions if service fails
          this.questions.set([]);
          this.startTimer();
        },
      });
  }

  private startTimer(): void {
    this.timerHandle = setInterval(() => {
      this.elapsedSecs.update((s) => s + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  selectOption(label: string): void {
    if (this.submitted()) return;
    const qId = this.currentQuestion()?._id;
    if (!qId) return;
    this.answers.update((list) =>
      list.map((a) => (a.questionId === qId ? { ...a, selectedAnswer: label } : a)),
    );
  }

  goTo(idx: number): void {
    if (idx >= 0 && idx < this.questions().length) {
      this.currentIdx.set(idx);
    }
  }

  prev(): void { this.goTo(this.currentIdx() - 1); }
  next(): void { this.goTo(this.currentIdx() + 1); }

  async submitChallenge(): Promise<void> {
    this.stopTimer();
    this.isSubmitting.set(true);

    const answersPayload = this.answers()
      .filter((a) => a.selectedAnswer !== null)
      .map((a) => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer! }));

    this.groupsService
      .submitChallenge(this.groupId(), this.challengeId(), {
        answers:   answersPayload,
        timeTaken: this.elapsedSecs(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            this.result.set(res.data);
            this.submitted.set(true);
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Failed to submit. Please try again.');
        },
      });
  }

  backToGroup(): void {
    this.router.navigate(['/study-groups', this.groupId()]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  rankEmoji(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  }

  isAnswered(idx: number): boolean {
    const q = this.questions()[idx];
    return !!this.answers().find((a) => a.questionId === q?._id)?.selectedAnswer;
  }

  trackByIdx(idx: number): number { return idx; }
}
