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
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  Institute,
  StudentResult,
  ClassStats,
  Batch,
  ReportData,
} from '../../../../core/models/institute.model';

type SortField = 'rank' | 'accuracy' | 'score' | 'timeTaken' | 'name';
type SortDir   = 'asc' | 'desc';

@Component({
  selector: 'app-results-view',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results-view.component.html',
  styleUrl: './results-view.component.scss',
})
export class ResultsViewComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly toastService     = inject(ToastService);
  private readonly route            = inject(ActivatedRoute);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute    = signal<Institute | null>(null);
  readonly results      = signal<StudentResult[]>([]);
  readonly classStats   = signal<ClassStats | null>(null);
  readonly isLoading    = signal(false);
  readonly isLoadingInstitute = signal(true);

  readonly selectedBatchId = signal<string | null>(null);
  readonly searchQuery     = signal('');
  readonly sortField       = signal<SortField>('rank');
  readonly sortDir         = signal<SortDir>('asc');
  readonly filterSubject   = signal('');

  readonly showReport      = signal(false);
  readonly reportData      = signal<ReportData | null>(null);
  readonly isLoadingReport = signal(false);

  readonly batches = computed(() => this.institute()?.batches ?? []);

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const subj = this.filterSubject();
    let rows = this.results();
    if (q) rows = rows.filter((r) => r.student.name.toLowerCase().includes(q) || r.student.email.toLowerCase().includes(q));
    if (subj) rows = rows.filter((r) => r.subject === subj);
    return this.sortRows(rows);
  });

  readonly subjects = computed(() =>
    [...new Set(this.results().map((r) => r.subject))].filter(Boolean),
  );

  ngOnInit(): void {
    this.instituteService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.institute.set(res.data.institute);
            // Auto-select batch from query param
            const qpBatch = this.route.snapshot.queryParamMap.get('batchId');
            const firstBatch = res.data.institute.batches[0]?._id ?? null;
            const batchId = qpBatch ?? firstBatch;
            if (batchId) {
              this.selectedBatchId.set(batchId);
              this.loadResults(batchId);
            }
          }
          this.isLoadingInstitute.set(false);
        },
        error: () => { this.isLoadingInstitute.set(false); },
      });
  }

  selectBatch(batchId: string): void {
    this.selectedBatchId.set(batchId);
    this.results.set([]);
    this.classStats.set(null);
    this.loadResults(batchId);
  }

  private loadResults(batchId: string): void {
    this.isLoading.set(true);
    this.instituteService.getBatchResults(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.results.set(res.data.results);
            this.classStats.set(res.data.classStats);
          }
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'rank' ? 'asc' : 'desc');
    }
  }

  private sortRows(rows: StudentResult[]): StudentResult[] {
    const field = this.sortField();
    const dir   = this.sortDir();
    return [...rows].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (field === 'name') { va = a.student.name; vb = b.student.name; }
      else if (field === 'rank') { va = a.rank; vb = b.rank; }
      else if (field === 'accuracy') { va = a.accuracy; vb = b.accuracy; }
      else if (field === 'score') { va = a.score; vb = b.score; }
      else { va = a.timeTaken; vb = b.timeTaken; }
      if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return dir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }

  loadReport(): void {
    const batchId = this.selectedBatchId();
    this.isLoadingReport.set(true);
    this.instituteService.generateReport(batchId ? { batchId } : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoadingReport.set(false);
          if (res.success && res.data.reportData) {
            this.reportData.set(res.data.reportData);
            this.showReport.set(true);
          }
        },
        error: () => { this.isLoadingReport.set(false); this.toastService.error('Failed to generate report.'); },
      });
  }

  exportCsv(): void {
    const rows = this.filtered();
    if (!rows.length) return;
    const header = 'Rank,Name,Email,Subject,Accuracy,Score,Correct,Total,Time(s),Completed';
    const lines = rows.map((r) =>
      [r.rank, r.student.name, r.student.email, r.subject, r.accuracy, r.score,
        r.correctCount, r.totalQuestions, r.timeTaken, r.completedAt].join(','),
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'results.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  fmtTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  trackById(_: number, r: StudentResult): string { return r._id; }
  trackByBatchId(_: number, b: Batch): string { return b._id; }
}
