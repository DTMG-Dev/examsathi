import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParentService } from '../../../../core/services/parent.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  LinkedChild,
  ChildProgress,
  WeeklyReport,
  WeakArea,
  ChartDot,
  RadarLabel,
  RadarAxis,
  RadarGrid,
} from '../../../../core/models/parent.model';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './parent-dashboard.component.html',
  styleUrl: './parent-dashboard.component.scss',
})
export class ParentDashboardComponent implements OnInit {
  private readonly parentService = inject(ParentService);
  private readonly toastService  = inject(ToastService);
  private readonly destroyRef    = inject(DestroyRef);

  // ── Data signals ────────────────────────────────────────────────────────────

  readonly children         = signal<LinkedChild[]>([]);
  readonly isLoadingChildren = signal(true);
  readonly selectedChildId  = signal<string | null>(null);

  readonly progress     = signal<ChildProgress | null>(null);
  readonly weeklyReport = signal<WeeklyReport | null>(null);
  readonly weakAreas    = signal<WeakArea[]>([]);
  readonly isLoading    = signal(false);

  // ── Modal signals ────────────────────────────────────────────────────────────

  readonly showLinkModal = signal(false);
  readonly linkEmail     = signal('');
  readonly isLinking     = signal(false);

  // ── Computed signals ─────────────────────────────────────────────────────────

  readonly hasChildren = computed(() => this.children().length > 0);

  readonly selectedChild = computed(() =>
    this.children().find((c) => c._id === this.selectedChildId()) ?? null,
  );

  // SVG line chart dots (Score Trend)
  readonly lineDots = computed<ChartDot[]>(() => {
    const trend = this.progress()?.scoreTrend ?? [];
    if (!trend.length) return [];
    const W = 400, H = 150;
    return trend.map((p, i) => ({
      x:        trend.length > 1 ? (i / (trend.length - 1)) * W : W / 2,
      y:        H - (p.accuracy / 100) * H,
      accuracy: p.accuracy,
      date:     p.date,
    }));
  });

  readonly linePolyline = computed(() =>
    this.lineDots().map((d) => `${d.x},${d.y}`).join(' '),
  );

  readonly lineFillPath = computed(() => {
    const dots = this.lineDots();
    if (dots.length < 2) return '';
    return `M 0,150 L ${dots.map((d) => `${d.x},${d.y}`).join(' L ')} L 400,150 Z`;
  });

  // SVG radar chart (Subject Performance)
  readonly radarPolygon = computed(() => {
    const subjects = this.progress()?.subjectPerformance ?? [];
    if (subjects.length < 3) return '';
    const N = subjects.length;
    return subjects.map((s, i) => {
      const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
      const r = (s.accuracy / 100) * 90;
      return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');
  });

  readonly radarGridLines = computed<RadarGrid[]>(() => {
    const subjects = this.progress()?.subjectPerformance ?? [];
    if (subjects.length < 3) return [];
    const N = subjects.length;
    return [20, 40, 60, 80, 100].map((pct) => ({
      pct,
      points: subjects.map((_, i) => {
        const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
        const r = (pct / 100) * 90;
        return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
      }).join(' '),
    }));
  });

  readonly radarAxes = computed<RadarAxis[]>(() => {
    const subjects = this.progress()?.subjectPerformance ?? [];
    if (subjects.length < 3) return [];
    const N = subjects.length;
    return subjects.map((_, i) => {
      const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
      return {
        x2: +(90 * Math.cos(angle)).toFixed(1),
        y2: +(90 * Math.sin(angle)).toFixed(1),
      };
    });
  });

  readonly radarLabels = computed<RadarLabel[]>(() => {
    const subjects = this.progress()?.subjectPerformance ?? [];
    if (subjects.length < 3) return [];
    const N = subjects.length;
    return subjects.map((s, i) => {
      const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
      const r = 110;
      return {
        subject:  s.subject,
        accuracy: s.accuracy,
        x:        +(r * Math.cos(angle)).toFixed(1),
        y:        +(r * Math.sin(angle)).toFixed(1),
      };
    });
  });

  // Bar chart helpers
  readonly maxDailyMinutes = computed(() =>
    Math.max(...(this.progress()?.dailyStudyTime ?? []).map((d) => d.minutes), 1),
  );

  readonly maxHeatmapCount = computed(() =>
    Math.max(...(this.progress()?.studyHeatmap ?? []).map((h) => h.count), 1),
  );

  readonly peakHour = computed(() => {
    const heatmap = this.progress()?.studyHeatmap ?? [];
    if (!heatmap.length) return null;
    return heatmap.reduce((a, b) => (a.count > b.count ? a : b));
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.parentService.getMyChildren()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoadingChildren.set(false);
          if (res.success && res.data.children.length) {
            this.children.set(res.data.children);
            const firstId = res.data.children[0]._id;
            this.selectedChildId.set(firstId);
            this.loadChildData(firstId);
          }
        },
        error: () => this.isLoadingChildren.set(false),
      });
  }

  selectChild(id: string): void {
    if (id === this.selectedChildId()) return;
    this.selectedChildId.set(id);
    this.progress.set(null);
    this.weeklyReport.set(null);
    this.weakAreas.set([]);
    this.loadChildData(id);
  }

  private loadChildData(childId: string): void {
    this.isLoading.set(true);

    this.parentService.getChildProgress(childId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.progress.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });

    this.parentService.getWeeklyReport(childId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { if (res.success) this.weeklyReport.set(res.data); },
        error: () => {},
      });

    this.parentService.getChildWeakAreas(childId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { if (res.success) this.weakAreas.set(res.data.weakAreas); },
        error: () => {},
      });
  }

  // ── Modal ────────────────────────────────────────────────────────────────────

  openLinkModal(): void  { this.showLinkModal.set(true); this.linkEmail.set(''); }
  closeLinkModal(): void { this.showLinkModal.set(false); }

  submitLinkChild(): void {
    const email = this.linkEmail().trim();
    if (!email) { this.toastService.error('Enter the student email.'); return; }

    this.isLinking.set(true);
    this.parentService.linkChild(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLinking.set(false);
          if (res.success) {
            this.closeLinkModal();
            this.toastService.success('Child linked!');
            const child = res.data.child;
            this.children.update((cs) => [...cs, child]);
            this.selectedChildId.set(child._id);
            this.loadChildData(child._id);
          }
        },
        error: (err) => {
          this.isLinking.set(false);
          this.toastService.error(err?.error?.error ?? 'Failed to link child.');
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  barHeightPx(minutes: number): number {
    const max = this.maxDailyMinutes();
    if (!minutes) return 3;
    return Math.max(3, Math.round((minutes / max) * 90));
  }

  heatOpacity(count: number): number {
    return +(0.12 + (count / this.maxHeatmapCount()) * 0.88).toFixed(2);
  }

  dayLabel(dateStr: string): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T12:00:00').getDay()];
  }

  formatHour(h: number): string {
    if (h === 0)  return '12am';
    if (h < 12)  return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  }

  improvSign(n: number): string {
    return n > 0 ? `+${n}%` : `${n}%`;
  }

  alertIcon(type: string): string {
    return type === 'warning' ? '⚠️' : type === 'success' ? '🎉' : 'ℹ️';
  }

  priorityColor(p: string): string {
    return p === 'critical' ? '#ef4444' : p === 'moderate' ? '#f59e0b' : '#10b981';
  }

  trackByChildId(_: number, c: LinkedChild): string { return c._id; }
  trackBySubject(_: number, s: { subject: string }): string { return s.subject; }
  trackByIdx(i: number): number { return i; }
}
