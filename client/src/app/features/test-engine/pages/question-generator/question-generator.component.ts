import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuestionsService } from '../../../../core/services/questions.service';
import { Question, Exam, Difficulty, Language } from '../../../../core/models/question.model';
import {
  EXAM_LIST,
  EXAM_SUBJECTS,
  ExamInfo,
  SubjectInfo,
} from '../../../../shared/constants/exam-data.constants';

@Component({
  selector: 'app-question-generator',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Offline banner -->
    @if (isOffline()) {
      <div class="offline-banner" role="alert">
        <span>📡</span>
        <span>You're offline — connect to generate new questions</span>
      </div>
    }

    <div class="flex flex-col gap-6 p-4 md:p-6">

      <!-- Header -->
      <div class="flex flex-col gap-1">
        <h1 class="font-heading font-bold text-2xl text-white">
          AI Question Generator
        </h1>
        <p class="text-white/50 text-sm">
          Generate exam-pattern MCQs powered by Claude AI
        </p>
      </div>

      <!-- Step progress bar -->
      <div class="flex items-center gap-2">
        @for (s of STEPS; track s.number) {
          <div class="flex items-center gap-2 flex-1">
            <!-- Step circle -->
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 shrink-0"
              [class.bg-primary]="step() >= s.number"
              [class.text-white]="step() >= s.number"
              [class.bg-white]="step() < s.number"
              [class.bg-opacity-10]="step() < s.number"
              [class.text-white]="step() < s.number"
              [class.text-opacity-30]="step() < s.number"
            >
              @if (step() > s.number) {
                ✓
              } @else {
                {{ s.number }}
              }
            </div>
            <!-- Connector line (except after last step) -->
            @if (s.number < STEPS.length) {
              <div
                class="h-0.5 flex-1 rounded-full transition-all duration-300"
                [class.bg-primary]="step() > s.number"
                [style.background]="step() > s.number ? '#FF6B35' : 'rgba(255,255,255,0.1)'"
              ></div>
            }
          </div>
        }
      </div>

      <!-- Step label -->
      <p class="text-white/60 text-sm -mt-2">
        Step {{ step() }} of {{ STEPS.length }} —
        <span class="text-white font-medium">{{ STEPS[step() - 1].label }}</span>
      </p>

      <!-- ──────────────────────────────── STEP 1: Select Exam ──────────────── -->
      @if (step() === 1) {
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-3">
            @for (exam of examList; track exam.id) {
              <button
                type="button"
                class="glass-card flex flex-col gap-2 p-4 w-full cursor-pointer transition-all duration-200"
                style="max-width: 160px; min-height: 110px;"
                [style.border-color]="selectedExam() === exam.id ? exam.colour : 'rgba(255,255,255,0.08)'"
                [style.box-shadow]="selectedExam() === exam.id ? '0 0 0 2px ' + exam.colour + '40' : 'none'"
                (click)="selectExam(exam.id)"
                [attr.aria-pressed]="selectedExam() === exam.id"
                [attr.aria-label]="'Select ' + exam.name"
              >
                <span class="text-3xl">{{ exam.icon }}</span>
                <span class="font-heading font-bold text-white text-sm">{{ exam.name }}</span>
                <span class="text-white/40 text-xs leading-tight">{{ exam.description }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- ──────────────────────────── STEP 2: Select Subject ──────────────── -->
      @if (step() === 2) {
        <div class="flex flex-col gap-3">
          @for (subj of subjectList(); track subj.name) {
            <button
              type="button"
              class="glass-card flex items-center gap-4 p-4 cursor-pointer text-left transition-all duration-200"
              [style.border-color]="selectedSubject() === subj.name ? '#FF6B35' : 'rgba(255,255,255,0.08)'"
              [style.background]="selectedSubject() === subj.name ? 'rgba(255,107,53,0.08)' : ''"
              (click)="selectSubject(subj.name)"
              [attr.aria-pressed]="selectedSubject() === subj.name"
            >
              <span class="text-2xl w-10 text-center shrink-0">{{ subj.icon }}</span>
              <div class="flex flex-col gap-0.5">
                <span class="font-semibold text-white">{{ subj.name }}</span>
                <span class="text-white/40 text-xs">{{ subj.topics.length }} topics</span>
              </div>
              @if (selectedSubject() === subj.name) {
                <span class="ml-auto text-primary text-lg">✓</span>
              }
            </button>
          }
        </div>
      }

      <!-- ──────────────────────────── STEP 3: Select Topic ────────────────── -->
      @if (step() === 3) {
        <div class="flex flex-col gap-3">
          <!-- Search -->
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">🔍</span>
            <input
              type="text"
              class="input-field pl-9"
              placeholder="Search topics..."
              [ngModel]="topicSearch()"
              (ngModelChange)="topicSearch.set($event)"
              aria-label="Search topics"
            />
          </div>

          <!-- Topic list -->
          <div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            @if (filteredTopics().length === 0) {
              <div class="empty-state py-8">
                <span class="text-3xl">🔍</span>
                <p class="text-white/50 text-sm">No topics match "{{ topicSearch() }}"</p>
              </div>
            }
            @for (topic of filteredTopics(); track topic) {
              <button
                type="button"
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer"
                [style.background]="selectedTopic() === topic ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)'"
                [style.border]="selectedTopic() === topic ? '1px solid rgba(255,107,53,0.4)' : '1px solid rgba(255,255,255,0.06)'"
                (click)="selectedTopic.set(topic)"
                [attr.aria-pressed]="selectedTopic() === topic"
              >
                <span class="w-2 h-2 rounded-full shrink-0 transition-colors duration-200"
                  [style.background]="selectedTopic() === topic ? '#FF6B35' : 'rgba(255,255,255,0.2)'"
                ></span>
                <span class="text-sm text-white/80">{{ topic }}</span>
                @if (selectedTopic() === topic) {
                  <span class="ml-auto text-primary text-sm">✓</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- ───────────── STEP 4: Difficulty + Question Count ────────────────── -->
      @if (step() === 4) {
        <div class="flex flex-col gap-6">
          <!-- Difficulty -->
          <div class="flex flex-col gap-3">
            <label class="text-sm font-medium text-white/70">Difficulty Level</label>
            <div class="flex gap-3">
              @for (d of DIFFICULTY_OPTIONS; track d.value) {
                <button
                  type="button"
                  class="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 cursor-pointer"
                  [style.border-color]="difficulty() === d.value ? d.colour : 'rgba(255,255,255,0.08)'"
                  [style.background]="difficulty() === d.value ? d.colour + '18' : 'rgba(255,255,255,0.03)'"
                  (click)="difficulty.set(d.value)"
                  [attr.aria-pressed]="difficulty() === d.value"
                >
                  <span class="text-xl">{{ d.icon }}</span>
                  <span class="text-xs font-semibold capitalize"
                    [style.color]="difficulty() === d.value ? d.colour : 'rgba(255,255,255,0.5)'"
                  >{{ d.value }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Question count slider -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-white/70">Number of Questions</label>
              <span class="text-primary font-bold text-lg">{{ count() }}</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              class="w-full accent-primary cursor-pointer"
              [ngModel]="count()"
              (ngModelChange)="count.set(+$event)"
              aria-label="Number of questions"
            />
            <div class="flex justify-between text-xs text-white/30">
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>

          <!-- Estimated time -->
          <div class="glass-card p-3 flex items-center gap-3">
            <span class="text-xl">⏱️</span>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-white/40">Estimated test time</span>
              <span class="text-sm font-semibold text-white">{{ estimatedMinutes() }} minutes</span>
            </div>
          </div>
        </div>
      }

      <!-- ──────────────────────── STEP 5: Language ─────────────────────────── -->
      @if (step() === 5) {
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3">
            <label class="text-sm font-medium text-white/70">Question Language</label>
            <div class="flex gap-4">
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer"
                [style.border-color]="language() === 'en' ? '#FF6B35' : 'rgba(255,255,255,0.08)'"
                [style.background]="language() === 'en' ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)'"
                (click)="language.set('en')"
                [attr.aria-pressed]="language() === 'en'"
              >
                <span class="text-3xl">🇬🇧</span>
                <span class="font-semibold text-white">English</span>
                <span class="text-xs text-white/40">Standard exam language</span>
              </button>
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer"
                [style.border-color]="language() === 'hi' ? '#FF6B35' : 'rgba(255,255,255,0.08)'"
                [style.background]="language() === 'hi' ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)'"
                (click)="language.set('hi')"
                [attr.aria-pressed]="language() === 'hi'"
              >
                <span class="text-3xl">🇮🇳</span>
                <span class="font-semibold text-white">हिन्दी</span>
                <span class="text-xs text-white/40">Hindi medium</span>
              </button>
            </div>
          </div>

          <!-- Summary card -->
          <div class="glass-card p-4 flex flex-col gap-3">
            <p class="text-xs font-semibold text-white/40 uppercase tracking-wider">Test Summary</p>
            <div class="flex flex-col gap-2">
              @for (item of summary(); track item.label) {
                <div class="flex items-center justify-between">
                  <span class="text-sm text-white/60">{{ item.label }}</span>
                  <span class="text-sm font-semibold text-white">{{ item.value }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ──────────────────────── Generating (loading state) ─────────────── -->
      @if (isGenerating()) {
        <div class="glass-card p-8 flex flex-col items-center gap-5 text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center"
            style="background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(233,69,96,0.2));">
            <span class="text-3xl">🤖</span>
          </div>
          <div class="flex flex-col gap-1">
            <p class="font-heading font-bold text-white">AI is crafting your questions</p>
            <p class="text-white/40 text-sm">
              Generating {{ count() }} {{ difficulty() }}-level {{ selectedExam() }} questions on
              <span class="text-white/60">{{ selectedTopic() }}</span>
            </p>
          </div>
          <div class="ai-thinking" aria-label="Generating questions">
            <span></span><span></span><span></span>
          </div>
          <p class="text-xs text-white/25">This may take 10–20 seconds</p>
        </div>
      }

      <!-- ─────────────────────────── Error state ──────────────────────────── -->
      @if (error()) {
        <div class="glass-card p-4 flex items-start gap-3"
          style="border-color: rgba(233,69,96,0.3); background: rgba(233,69,96,0.06);">
          <span class="text-xl shrink-0">⚠️</span>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-red-400">Generation failed</p>
            <p class="text-xs text-white/50">{{ error() }}</p>
          </div>
          <button
            type="button"
            class="ml-auto text-white/40 hover:text-white transition-colors text-lg"
            (click)="error.set(null)"
            aria-label="Dismiss error"
          >×</button>
        </div>
      }

      <!-- ─────────────────────────── Navigation buttons ───────────────────── -->
      @if (!isGenerating()) {
        <div class="flex items-center gap-3 mt-2">
          @if (step() > 1) {
            <button
              type="button"
              class="btn-secondary px-5"
              (click)="prevStep()"
              [disabled]="isGenerating()"
            >
              ← Back
            </button>
          }

          @if (step() < STEPS.length) {
            <button
              type="button"
              class="btn-primary flex-1"
              (click)="nextStep()"
              [disabled]="!canProceed()"
            >
              Continue →
            </button>
          } @else {
            <button
              type="button"
              class="btn-primary flex-1"
              (click)="generate()"
              [disabled]="!canProceed() || isGenerating()"
            >
              <span>✨</span>
              Generate Test
            </button>
          }
        </div>
      }

    </div>
  `,
})
export class QuestionGeneratorComponent {
  private readonly questionsService = inject(QuestionsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── Wizard state (all signals) ────────────────────────────────────────────
  readonly step = signal<number>(1);
  readonly selectedExam = signal<Exam | null>(null);
  readonly selectedSubject = signal<string | null>(null);
  readonly selectedTopic = signal<string | null>(null);
  readonly difficulty = signal<Difficulty>('medium');
  readonly count = signal<number>(10);
  readonly language = signal<Language>('en');
  readonly topicSearch = signal<string>('');
  readonly isGenerating = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isOffline = signal<boolean>(!navigator.onLine);

  // ── Static data ───────────────────────────────────────────────────────────
  readonly examList: ExamInfo[] = EXAM_LIST;
  readonly STEPS = [
    { number: 1, label: 'Choose Exam' },
    { number: 2, label: 'Choose Subject' },
    { number: 3, label: 'Choose Topic' },
    { number: 4, label: 'Difficulty & Count' },
    { number: 5, label: 'Language & Review' },
  ];
  readonly DIFFICULTY_OPTIONS = [
    { value: 'easy' as Difficulty, icon: '🌱', colour: '#06D6A0' },
    { value: 'medium' as Difficulty, icon: '⚡', colour: '#FFD166' },
    { value: 'hard' as Difficulty, icon: '🔥', colour: '#EF476F' },
  ];

  // ── Derived computed signals ──────────────────────────────────────────────
  readonly subjectList = computed<SubjectInfo[]>(() => {
    const exam = this.selectedExam();
    if (!exam) return [];
    return EXAM_SUBJECTS[exam] ?? [];
  });

  readonly filteredTopics = computed<string[]>(() => {
    const exam = this.selectedExam();
    const subject = this.selectedSubject();
    const search = this.topicSearch().trim().toLowerCase();
    if (!exam || !subject) return [];
    const subjectData = EXAM_SUBJECTS[exam]?.find((s) => s.name === subject);
    if (!subjectData) return [];
    if (!search) return subjectData.topics;
    return subjectData.topics.filter((t) => t.toLowerCase().includes(search));
  });

  readonly canProceed = computed<boolean>(() => {
    switch (this.step()) {
      case 1: return this.selectedExam() !== null;
      case 2: return this.selectedSubject() !== null;
      case 3: return this.selectedTopic() !== null;
      case 4: return this.count() >= 5 && this.count() <= 30;
      case 5: return true;
      default: return false;
    }
  });

  readonly estimatedMinutes = computed(() => Math.round(this.count() * 1.5));

  readonly summary = computed(() => [
    { label: 'Exam', value: this.selectedExam() ?? '—' },
    { label: 'Subject', value: this.selectedSubject() ?? '—' },
    { label: 'Topic', value: this.selectedTopic() ?? '—' },
    { label: 'Difficulty', value: this.difficulty() },
    { label: 'Questions', value: String(this.count()) },
    { label: 'Duration', value: `${this.estimatedMinutes()} min` },
    { label: 'Language', value: this.language() === 'hi' ? 'हिन्दी' : 'English' },
  ]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  constructor() {
    window.addEventListener('online', () => this.isOffline.set(false));
    window.addEventListener('offline', () => this.isOffline.set(true));
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  selectExam(exam: Exam): void {
    if (this.selectedExam() !== exam) {
      this.selectedExam.set(exam);
      this.selectedSubject.set(null);
      this.selectedTopic.set(null);
    }
  }

  selectSubject(subject: string): void {
    if (this.selectedSubject() !== subject) {
      this.selectedSubject.set(subject);
      this.selectedTopic.set(null);
      this.topicSearch.set('');
    }
  }

  nextStep(): void {
    if (this.canProceed() && this.step() < this.STEPS.length) {
      this.step.update((s) => s + 1);
      this.error.set(null);
    }
  }

  prevStep(): void {
    if (this.step() > 1) {
      this.step.update((s) => s - 1);
      this.error.set(null);
    }
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  generate(): void {
    if (!this.canProceed() || this.isGenerating()) return;

    this.isGenerating.set(true);
    this.error.set(null);

    this.questionsService
      .generate({
        exam: this.selectedExam()!,
        subject: this.selectedSubject()!,
        topic: this.selectedTopic()!,
        difficulty: this.difficulty(),
        count: this.count(),
        language: this.language(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isGenerating.set(false);
          // Navigate to test session with the generated questions as state
          this.router.navigate(['/tests', 'session'], {
            state: { questions: res.data.questions as Question[] },
          });
        },
        error: (err) => {
          this.isGenerating.set(false);
          const msg =
            err?.error?.error ??
            err?.message ??
            'Something went wrong. Please try again.';
          this.error.set(msg);
        },
      });
  }
}
