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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  Institute,
  Batch,
  CreateBatchRequest,
  ExamType,
  AddStudentsRequest,
} from '../../../../core/models/institute.model';

@Component({
  selector: 'app-batch-management',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './batch-management.component.html',
  styleUrl: './batch-management.component.scss',
})
export class BatchManagementComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly toastService     = inject(ToastService);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute      = signal<Institute | null>(null);
  readonly isLoading      = signal(true);
  readonly isSubmitting   = signal(false);

  // Modals
  readonly showCreateBatch   = signal(false);
  readonly showAddStudents   = signal(false);
  readonly selectedBatchId   = signal<string | null>(null);

  // CSV tab vs manual
  readonly addMode = signal<'manual' | 'csv'>('manual');

  // Create batch form
  readonly batchForm = signal<CreateBatchRequest>({ name: '', exam: 'NEET' });

  // Add students form
  readonly studentRows = signal<{ name: string; email: string; phone: string }[]>([
    { name: '', email: '', phone: '' },
  ]);
  readonly csvData = signal('');

  readonly examOptions: ExamType[] = ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'];

  readonly selectedBatch = computed(() =>
    this.institute()?.batches.find((b) => b._id === this.selectedBatchId()) ?? null,
  );

  ngOnInit(): void {
    this.loadInstitute();
  }

  private loadInstitute(): void {
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

  // ── Create batch ──────────────────────────────────────────────────────────

  openCreateBatch(): void  { this.showCreateBatch.set(true); }
  closeCreateBatch(): void { this.showCreateBatch.set(false); this.batchForm.set({ name: '', exam: 'NEET' }); }

  submitCreateBatch(): void {
    const f = this.batchForm();
    if (!f.name.trim()) { this.toastService.error('Batch name is required.'); return; }

    this.isSubmitting.set(true);
    this.instituteService.createBatch(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            this.closeCreateBatch();
            this.toastService.success('Batch created!');
            this.loadInstitute();
          }
        },
        error: () => { this.isSubmitting.set(false); this.toastService.error('Failed to create batch.'); },
      });
  }

  // ── Add students ──────────────────────────────────────────────────────────

  openAddStudents(batchId: string): void {
    this.selectedBatchId.set(batchId);
    this.studentRows.set([{ name: '', email: '', phone: '' }]);
    this.csvData.set('');
    this.addMode.set('manual');
    this.showAddStudents.set(true);
  }

  closeAddStudents(): void { this.showAddStudents.set(false); this.selectedBatchId.set(null); }

  addStudentRow(): void {
    this.studentRows.update((rows) => [...rows, { name: '', email: '', phone: '' }]);
  }

  removeStudentRow(i: number): void {
    this.studentRows.update((rows) => rows.filter((_, idx) => idx !== i));
  }

  updateStudentRow(i: number, field: 'name' | 'email' | 'phone', value: string): void {
    this.studentRows.update((rows) => {
      const updated = [...rows];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  }

  submitAddStudents(): void {
    const batchId = this.selectedBatchId();
    if (!batchId) return;

    let body: AddStudentsRequest;
    if (this.addMode() === 'csv') {
      if (!this.csvData().trim()) { this.toastService.error('Paste CSV data first.'); return; }
      body = { csvData: this.csvData() };
    } else {
      const valid = this.studentRows().filter((r) => r.email.trim());
      if (!valid.length) { this.toastService.error('Add at least one student email.'); return; }
      body = { students: valid };
    }

    this.isSubmitting.set(true);
    this.instituteService.addStudents(batchId, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            const d = res.data;
            this.closeAddStudents();
            this.toastService.success(`${d.added.length} added, ${d.skipped.length} skipped`);
            this.loadInstitute();
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastService.error(err?.error?.error ?? 'Failed to add students.');
        },
      });
  }

  patchBatchForm(patch: Partial<CreateBatchRequest>): void {
    this.batchForm.update((f) => ({ ...f, ...patch }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  examColor(exam: string): string {
    const map: Record<string, string> = {
      NEET: '#10b981', JEE: '#3b82f6', UPSC: '#8b5cf6', CAT: '#f59e0b', SSC: '#ec4899',
    };
    return map[exam] ?? '#6b7280';
  }

  trackById(_: number, b: Batch): string { return b._id; }
  trackByIdx(i: number): number { return i; }
}
