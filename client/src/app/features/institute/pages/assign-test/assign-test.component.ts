import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  Institute,
  Batch,
  AssignTestRequest,
  ExamType,
  Difficulty,
} from '../../../../core/models/institute.model';

type Step = 'batch' | 'configure' | 'preview';

@Component({
  selector: 'app-assign-test',
  standalone: true,
  imports: [FormsModule, RouterLink, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assign-test.component.html',
  styleUrl: './assign-test.component.scss',
})
export class AssignTestComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly toastService     = inject(ToastService);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute    = signal<Institute | null>(null);
  readonly isLoading    = signal(true);
  readonly isSubmitting = signal(false);
  readonly assigned     = signal(false);
  readonly assignResult = signal<{ sessionsCreated: number; questionCount: number } | null>(null);

  readonly step = signal<Step>('batch');

  readonly selectedBatchId = signal<string | null>(null);
  readonly topicInput      = signal('');

  readonly form = signal<AssignTestRequest>({
    exam:          'NEET',
    subject:       '',
    topics:        [],
    difficulty:    'mixed',
    questionCount: 30,
    duration:      60,
    scheduledAt:   '',
  });

  readonly examOptions: ExamType[]   = ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'];
  readonly diffOptions: Difficulty[] = ['easy', 'medium', 'hard', 'mixed'];
  readonly steps: Step[]             = ['batch', 'configure', 'preview'];

  readonly activeBatches = computed(() =>
    (this.institute()?.batches ?? []).filter((b) => b.isActive),
  );

  readonly selectedBatch = computed(() =>
    this.activeBatches().find((b) => b._id === this.selectedBatchId()) ?? null,
  );

  readonly canProceed = computed(() => {
    if (this.step() === 'batch') return !!this.selectedBatchId();
    if (this.step() === 'configure') {
      const f = this.form();
      return !!f.exam && !!f.subject && f.questionCount > 0 && f.duration > 0;
    }
    return true;
  });

  ngOnInit(): void {
    this.instituteService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.institute.set(res.data.institute);
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  selectBatch(id: string): void { this.selectedBatchId.set(id); }

  updateForm(patch: Partial<AssignTestRequest>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  addTopic(): void {
    const t = this.topicInput().trim();
    if (!t) return;
    this.form.update((f) => ({ ...f, topics: [...(f.topics ?? []), t] }));
    this.topicInput.set('');
  }

  removeTopic(idx: number): void {
    this.form.update((f) => ({ ...f, topics: (f.topics ?? []).filter((_, i) => i !== idx) }));
  }

  next(): void {
    if (this.step() === 'batch')     this.step.set('configure');
    else if (this.step() === 'configure') this.step.set('preview');
  }

  back(): void {
    if (this.step() === 'configure') this.step.set('batch');
    else if (this.step() === 'preview') this.step.set('configure');
  }

  submitAssign(): void {
    const batchId = this.selectedBatchId();
    if (!batchId) return;

    this.isSubmitting.set(true);
    this.instituteService.assignTest(batchId, this.form())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            this.assignResult.set(res.data);
            this.assigned.set(true);
            this.toastService.success(`Test assigned to ${res.data.sessionsCreated} students!`);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastService.error(err?.error?.error ?? 'Failed to assign test.');
        },
      });
  }

  reset(): void {
    this.assigned.set(false);
    this.assignResult.set(null);
    this.step.set('batch');
    this.selectedBatchId.set(null);
    this.form.set({ exam: 'NEET', subject: '', topics: [], difficulty: 'mixed', questionCount: 30, duration: 60, scheduledAt: '' });
  }

  examColor(exam: string): string {
    const map: Record<string, string> = {
      NEET: '#10b981', JEE: '#3b82f6', UPSC: '#8b5cf6', CAT: '#f59e0b', SSC: '#ec4899',
    };
    return map[exam] ?? '#6b7280';
  }

  diffColor(d: string): string {
    return d === 'easy' ? '#10b981' : d === 'medium' ? '#f59e0b' : d === 'hard' ? '#ef4444' : '#6b7280';
  }

  minDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }

  trackById(_: number, b: Batch): string { return b._id; }
  trackByIdx(i: number): number { return i; }
}
