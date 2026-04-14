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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WeakAreaService } from '../../../../core/services/weak-area.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  WeakAreasResponse,
  SubjectHeatmap,
  WeakArea,
  WeakAreaInsightsResponse,
  AIInsights,
  DueReviewsResponse,
} from '../../../../core/models/weak-area.model';

type Tab = 'heatmap' | 'topics' | 'queue' | 'insights';

@Component({
  selector: 'app-weak-area-dashboard',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weak-area-dashboard.component.html',
  styleUrl: './weak-area-dashboard.component.scss',
})
export class WeakAreaDashboardComponent implements OnInit {
  private readonly weakAreaService = inject(WeakAreaService);
  private readonly toastService    = inject(ToastService);
  private readonly router          = inject(Router);
  private readonly destroyRef      = inject(DestroyRef);

  // ── Loading states ─────────────────────────────────────────────────────────
  readonly isLoading        = signal(true);
  readonly isInsightsLoading = signal(false);
  readonly isPracticeLoading = signal(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  readonly weakAreasData  = signal<WeakAreasResponse | null>(null);
  readonly dueReviews     = signal<DueReviewsResponse | null>(null);
  readonly insightsData   = signal<WeakAreaInsightsResponse | null>(null);

  // ── UI State ───────────────────────────────────────────────────────────────
  readonly activeTab        = signal<Tab>('heatmap');
  readonly expandedSubject  = signal<string | null>(null);
  readonly filterPriority   = signal<'all' | 'critical' | 'moderate' | 'good'>('all');

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly summary    = computed(() => this.weakAreasData()?.summary ?? null);
  readonly heatmap    = computed(() => this.weakAreasData()?.heatmap ?? []);
  readonly allTopics  = computed(() => this.weakAreasData()?.weakAreas ?? []);
  readonly avgAccuracy = computed(() => this.weakAreasData()?.avgAccuracy ?? 0);

  readonly filteredTopics = computed(() => {
    const filter = this.filterPriority();
    const topics = this.allTopics();
    if (filter === 'all') return topics;
    return topics.filter((t) => t.priority === filter);
  });

  readonly criticalTopics = computed(() =>
    this.allTopics().filter((t) => t.priority === 'critical').slice(0, 5),
  );

  readonly dueCount = computed(() => this.dueReviews()?.count ?? 0);
  readonly dueList  = computed(() => this.dueReviews()?.reviews ?? []);

  readonly insights    = computed(() => this.insightsData()?.insights ?? null);
  readonly topWeakAreas = computed(() => this.insightsData()?.topWeakAreas ?? []);
  readonly hasInsights  = computed(() => this.insightsData()?.hasInsights ?? false);

  readonly accuracyColor = computed(() => {
    const acc = this.avgAccuracy();
    if (acc < 40) return '#ef4444';
    if (acc < 70) return '#f97316';
    return '#22c55e';
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadData();
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  loadData(): void {
    this.isLoading.set(true);

    this.weakAreaService
      .getWeakAreas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.weakAreasData.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.error('Failed to load weak areas');
          this.isLoading.set(false);
        },
      });

    this.weakAreaService
      .getDueReviews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { if (res.success) this.dueReviews.set(res.data); },
        error: () => {},
      });
  }

  loadInsights(): void {
    if (this.insightsData()) return; // already loaded
    this.isInsightsLoading.set(true);

    this.weakAreaService
      .getInsights()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.insightsData.set(res.data);
          this.isInsightsLoading.set(false);
        },
        error: () => {
          this.toastService.error('Failed to load AI insights');
          this.isInsightsLoading.set(false);
        },
      });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'insights' && !this.insightsData()) {
      this.loadInsights();
    }
  }

  toggleSubject(subject: string): void {
    this.expandedSubject.update((s) => (s === subject ? null : subject));
  }

  startAdaptivePractice(count = 20): void {
    this.isPracticeLoading.set(true);

    this.weakAreaService
      .startPractice({ count })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isPracticeLoading.set(false);
          if (res.success) {
            this.router.navigate(['/weak-areas/adaptive-test'], {
              state: { session: res.data },
            });
          }
        },
        error: (err) => {
          this.isPracticeLoading.set(false);
          this.toastService.error(err?.error?.error ?? 'Could not start practice session');
        },
      });
  }

  startDueReviewPractice(): void {
    this.startAdaptivePractice(Math.min(this.dueCount() * 3, 30));
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = { critical: 'Critical', moderate: 'Moderate', good: 'Good' };
    return labels[priority] ?? priority;
  }

  getAccuracyBand(accuracy: number): 'critical' | 'moderate' | 'good' {
    if (accuracy < 40) return 'critical';
    if (accuracy < 70) return 'moderate';
    return 'good';
  }

  getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      improving: '📈',
      declining: '📉',
      stable: '➡️',
      insufficient_data: '—',
    };
    return icons[trend] ?? '—';
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  trackBySubject(_: number, item: SubjectHeatmap): string { return item.subject; }
  trackByTopic(_: number, item: WeakArea): string         { return item._id; }
}
