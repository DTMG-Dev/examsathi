import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Institute, LiveStats, CreateInstituteRequest } from '../../../../core/models/institute.model';

@Component({
  selector: 'app-institute-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institute-dashboard.component.html',
  styleUrl: './institute-dashboard.component.scss',
})
export class InstituteDashboardComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly toastService     = inject(ToastService);
  private readonly router           = inject(Router);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute    = signal<Institute | null>(null);
  readonly stats        = signal<LiveStats | null>(null);
  readonly isLoading    = signal(true);
  readonly isCreating   = signal(false);
  readonly showOnboard  = signal(false);

  readonly form = signal<CreateInstituteRequest>({
    name:        '',
    email:       '',
    phone:       '',
    brandColor:  '#FF6B35',
  });

  readonly recentBatches = computed(() =>
    (this.institute()?.batches ?? []).slice(-3).reverse(),
  );

  readonly statCards = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Total Students',  value: s.totalStudents, icon: '👥', color: '#3b82f6' },
      { label: 'Active Today',    value: s.activeToday,   icon: '🟢', color: '#10b981' },
      { label: 'Avg Score',       value: `${s.avgScore}%`, icon: '🎯', color: '#f59e0b' },
      { label: 'Tests Assigned',  value: s.testsAssigned, icon: '📝', color: '#8b5cf6' },
    ];
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.instituteService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.institute.set(res.data.institute);
            this.stats.set(res.data.stats);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.showOnboard.set(true);
        },
      });
  }

  updateForm(patch: Partial<CreateInstituteRequest>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  submitCreate(): void {
    const f = this.form();
    if (!f.name.trim() || !f.email.trim()) {
      this.toastService.error('Name and email are required.');
      return;
    }

    this.isCreating.set(true);
    this.instituteService.createInstitute(f)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isCreating.set(false);
          if (res.success) {
            this.institute.set(res.data);
            this.showOnboard.set(false);
            this.toastService.success('Institute created! Welcome to the portal.');
            this.loadData();
          }
        },
        error: (err) => {
          this.isCreating.set(false);
          this.toastService.error(err?.error?.error ?? 'Failed to create institute.');
        },
      });
  }

  examColor(exam: string): string {
    const map: Record<string, string> = {
      NEET: '#10b981', JEE: '#3b82f6', UPSC: '#8b5cf6', CAT: '#f59e0b', SSC: '#ec4899',
    };
    return map[exam] ?? '#6b7280';
  }
}
