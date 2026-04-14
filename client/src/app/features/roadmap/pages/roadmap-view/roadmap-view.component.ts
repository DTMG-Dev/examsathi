import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoadmapService } from '../../../../core/services/roadmap.service';
import { StudyRoadmap, RoadmapWeek, RoadmapTopic } from '../../../../core/models/roadmap.model';

@Component({
  selector: 'app-roadmap-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-16">

      @if (isLoading()) {
        <!-- Skeleton -->
        <div class="skeleton h-10 w-48 rounded-xl"></div>
        <div class="skeleton h-32 rounded-2xl"></div>
        @for (i of [1,2,3,4]; track i) {
          <div class="skeleton h-20 rounded-xl"></div>
        }
      }

      @if (!isLoading() && !roadmap()) {
        <!-- No roadmap state -->
        <div class="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <div class="w-20 h-20 rounded-3xl flex items-center justify-center"
            style="background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(233,69,96,0.2));">
            <span class="text-4xl">🗺️</span>
          </div>
          <div class="flex flex-col gap-2">
            <h2 class="font-heading font-bold text-xl text-white">No roadmap yet</h2>
            <p class="text-white/50 text-sm max-w-xs mx-auto">
              Generate your personalised AI study plan to see it here
            </p>
          </div>
          <button type="button" class="btn-primary px-8"
            (click)="goToGenerator()">
            <span>✨</span> Generate Roadmap
          </button>
        </div>
      }

      @if (!isLoading() && roadmap(); as rm) {

        <!-- Header row -->
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex flex-col gap-1">
            <h1 class="font-heading font-bold text-2xl text-white">
              {{ rm.exam }} Study Roadmap
            </h1>
            <p class="text-white/40 text-sm">
              {{ rm.weeks.length }} weeks · updated {{ formatDate(rm.aiGeneratedAt ?? rm.createdAt) }}
            </p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary px-4 py-2 text-sm"
              (click)="toggleView()"
              [style.border-color]="view() === 'timeline' ? 'rgba(255,107,53,0.6)' : ''">
              {{ view() === 'list' ? '📅 Timeline' : '📋 List' }}
            </button>
            <button type="button" class="btn-secondary px-4 py-2 text-sm"
              (click)="regenerate()"
              [disabled]="isRegenerating()">
              @if (isRegenerating()) {
                <span class="opacity-60">Regenerating…</span>
              } @else {
                🔄 Regenerate
              }
            </button>
          </div>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="glass-card p-4 flex items-start gap-3"
            style="border-color: rgba(239,71,111,0.3); background: rgba(239,71,111,0.06);">
            <span class="text-xl shrink-0">⚠️</span>
            <div class="flex flex-col gap-1 flex-1">
              <p class="text-sm font-semibold text-red-400">Error</p>
              <p class="text-xs text-white/50">{{ error() }}</p>
            </div>
            <button type="button" class="text-white/40 hover:text-white text-lg"
              (click)="error.set(null)">×</button>
          </div>
        }

        <!-- Overall progress card -->
        <div class="glass-card p-5 flex items-center gap-5">
          <!-- SVG Ring -->
          <div class="shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
              <circle cx="44" cy="44" r="36" fill="none"
                stroke="url(#rmap-grad)" stroke-width="8"
                stroke-linecap="round"
                [attr.stroke-dasharray]="RING_CIRC"
                [attr.stroke-dashoffset]="ringOffset()"
                transform="rotate(-90 44 44)"
                style="transition: stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)"/>
              <defs>
                <linearGradient id="rmap-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#ff6b35"/>
                  <stop offset="100%" stop-color="#e94560"/>
                </linearGradient>
              </defs>
              <text x="44" y="48" text-anchor="middle"
                fill="white" font-size="16" font-weight="700" font-family="Poppins,sans-serif">
                {{ rm.overallProgress }}%
              </text>
            </svg>
          </div>
          <div class="flex flex-col gap-3 flex-1">
            <div class="flex flex-col gap-0.5">
              <p class="font-semibold text-white">Overall Progress</p>
              <p class="text-white/40 text-sm">
                {{ completedTopics() }} of {{ totalTopics() }} topics completed
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <div class="flex flex-col gap-0.5 p-2.5 rounded-xl flex-1"
                style="background: rgba(255,255,255,0.04); min-width: 80px;">
                <span class="text-xs text-white/40">Exam</span>
                <span class="font-semibold text-white text-sm">{{ rm.exam }}</span>
              </div>
              <div class="flex flex-col gap-0.5 p-2.5 rounded-xl flex-1"
                style="background: rgba(255,255,255,0.04); min-width: 80px;">
                <span class="text-xs text-white/40">Exam Date</span>
                <span class="font-semibold text-white text-sm">{{ formatDate(rm.examDate) }}</span>
              </div>
              <div class="flex flex-col gap-0.5 p-2.5 rounded-xl flex-1"
                style="background: rgba(255,255,255,0.04); min-width: 80px;">
                <span class="text-xs text-white/40">Daily Hours</span>
                <span class="font-semibold text-white text-sm">{{ rm.dailyHours }}h</span>
              </div>
              <div class="flex flex-col gap-0.5 p-2.5 rounded-xl flex-1"
                style="background: rgba(255,255,255,0.04); min-width: 80px;">
                <span class="text-xs text-white/40">Weeks Left</span>
                <span class="font-semibold text-white text-sm">{{ weeksRemaining() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Strategy card -->
        @if (rm.strategy) {
          <div class="glass-card p-4 flex items-start gap-3"
            style="border-color: rgba(255,107,53,0.2);">
            <span class="text-xl shrink-0">🧠</span>
            <div class="flex flex-col gap-1">
              <p class="text-xs font-semibold text-primary uppercase tracking-wider">AI Strategy</p>
              <p class="text-sm text-white/70 leading-relaxed">{{ rm.strategy }}</p>
            </div>
          </div>
        }

        <!-- ── List view ────────────────────────────────────────────────────── -->
        @if (view() === 'list') {
          <div class="flex flex-col gap-3">
            @for (week of rm.weeks; track week._id; let wi = $index) {
              <div class="glass-card overflow-hidden"
                [style.border-color]="isCurrentWeek(week) ? 'rgba(255,107,53,0.4)' : ''">

                <!-- Week header (accordion toggle) -->
                <button type="button"
                  class="w-full flex items-center gap-3 p-4 text-left"
                  (click)="toggleWeek(week._id)">

                  <!-- Week number badge -->
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                    [style.background]="weekBadgeStyle(week)">
                    {{ week.weekNumber }}
                  </div>

                  <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-white text-sm">
                        Week {{ week.weekNumber }}
                      </span>
                      @if (isCurrentWeek(week)) {
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style="background: rgba(255,107,53,0.2); color: #ff6b35;">
                          Current
                        </span>
                      }
                      @if (week.isCompleted) {
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style="background: rgba(6,214,160,0.15); color: #06D6A0;">
                          Done ✓
                        </span>
                      }
                    </div>
                    <div class="flex items-center gap-2 text-xs text-white/40">
                      <span>{{ formatDate(week.startDate) }} – {{ formatDate(week.endDate) }}</span>
                      <span>·</span>
                      <span>{{ week.weeklyGoalHours }}h goal</span>
                      <span>·</span>
                      <span>{{ week.topics.length }} topics</span>
                    </div>
                  </div>

                  <!-- Week progress bar -->
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-xs text-white/40">{{ weekProgress(week) }}%</span>
                    <div class="w-16 h-1.5 rounded-full" style="background: rgba(255,255,255,0.08);">
                      <div class="h-full rounded-full transition-all duration-500"
                        [style.width]="weekProgress(week) + '%'"
                        [style.background]="week.isCompleted ? '#06D6A0' : 'linear-gradient(90deg,#ff6b35,#e94560)'">
                      </div>
                    </div>
                  </div>

                  <!-- Chevron -->
                  <span class="text-white/30 text-xs ml-1 transition-transform duration-200"
                    [style.transform]="expandedWeeks().has(week._id) ? 'rotate(180deg)' : ''">
                    ▼
                  </span>
                </button>

                <!-- Topics accordion body -->
                @if (expandedWeeks().has(week._id)) {
                  <div class="flex flex-col gap-2 px-4 pb-4">
                    <div class="h-px w-full" style="background: rgba(255,255,255,0.06);"></div>
                    @for (topic of week.topics; track topic._id) {
                      <div class="flex items-start gap-3 p-3 rounded-xl"
                        [style.background]="topic.isCompleted ? 'rgba(6,214,160,0.06)' : 'rgba(255,255,255,0.03)'"
                        [style.border]="'1px solid ' + (topic.isCompleted ? 'rgba(6,214,160,0.15)' : 'rgba(255,255,255,0.05)')">

                        <!-- Checkbox -->
                        <button type="button"
                          class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200"
                          [style.border-color]="topic.isCompleted ? '#06D6A0' : 'rgba(255,255,255,0.2)'"
                          [style.background]="topic.isCompleted ? 'rgba(6,214,160,0.2)' : 'transparent'"
                          (click)="toggleTopic(week._id, topic)">
                          @if (topic.isCompleted) {
                            <span class="text-xs" style="color: #06D6A0;">✓</span>
                          }
                        </button>

                        <div class="flex flex-col gap-1 flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <!-- Subject colour dot -->
                            <div class="w-2 h-2 rounded-full shrink-0"
                              [style.background]="subjectColour(topic.subject)"></div>
                            <span class="text-sm font-medium text-white"
                              [class.line-through]="topic.isCompleted"
                              [class.opacity-50]="topic.isCompleted">
                              {{ topic.topic }}
                            </span>
                          </div>
                          <div class="flex items-center gap-3 text-xs text-white/40 flex-wrap">
                            <span class="font-medium" [style.color]="subjectColour(topic.subject)">
                              {{ topic.subject }}
                            </span>
                            <span>{{ topic.estimatedHours }}h</span>
                            <span>Due {{ formatDate(topic.targetDate) }}</span>
                          </div>
                          @if (topic.resources.length > 0) {
                            <div class="flex flex-wrap gap-1 mt-1">
                              @for (res of topic.resources; track res) {
                                <span class="text-xs px-2 py-0.5 rounded-full"
                                  style="background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);">
                                  📖 {{ res }}
                                </span>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ── Timeline / Gantt view ────────────────────────────────────────── -->
        @if (view() === 'timeline') {
          <div class="glass-card p-5 overflow-x-auto">
            <p class="text-xs text-white/40 mb-4">Scroll horizontally to see all weeks</p>
            <div class="flex gap-2" style="min-width: max-content;">
              @for (week of rm.weeks; track week._id) {
                <div class="flex flex-col gap-2 rounded-xl p-3 cursor-pointer transition-all duration-200"
                  style="width: 120px; background: rgba(255,255,255,0.04);"
                  [style.border]="'1px solid ' + (isCurrentWeek(week) ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.06)')"
                  (click)="toggleWeek(week._id); toggleView()">

                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white">Wk {{ week.weekNumber }}</span>
                    @if (week.isCompleted) {
                      <span style="color: #06D6A0; font-size: 10px;">✓</span>
                    }
                    @if (isCurrentWeek(week)) {
                      <span style="color: #ff6b35; font-size: 10px;">●</span>
                    }
                  </div>

                  <!-- Stacked subject bars -->
                  <div class="flex flex-col gap-1">
                    @for (entry of weekSubjectSummary(week); track entry.subject) {
                      <div class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full shrink-0"
                          [style.background]="subjectColour(entry.subject)"></div>
                        <div class="flex-1 h-1.5 rounded-full overflow-hidden"
                          style="background: rgba(255,255,255,0.08);">
                          <div class="h-full rounded-full"
                            [style.width]="(entry.completed / entry.total * 100) + '%'"
                            [style.background]="subjectColour(entry.subject)"></div>
                        </div>
                        <span class="text-xs text-white/30" style="font-size:9px;">
                          {{ entry.completed }}/{{ entry.total }}
                        </span>
                      </div>
                    }
                  </div>

                  <div class="text-xs text-white/30 mt-1" style="font-size: 9px;">
                    {{ week.topics.length }} topics · {{ week.weeklyGoalHours }}h
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Click hint -->
          <p class="text-center text-xs text-white/20">
            Tap a week in timeline to switch to list view
          </p>
        }

      }
    </div>
  `,
})
export class RoadmapViewComponent implements OnInit {
  private readonly roadmapService = inject(RoadmapService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly RING_RADIUS = 36;
  readonly RING_CIRC = 2 * Math.PI * this.RING_RADIUS; // ≈ 226.2

  readonly isLoading = signal(true);
  readonly isRegenerating = signal(false);
  readonly error = signal<string | null>(null);
  readonly roadmap = signal<StudyRoadmap | null>(null);
  readonly view = signal<'list' | 'timeline'>('list');
  readonly expandedWeeks = signal<Set<string>>(new Set());
  readonly animateRing = signal(false);

  readonly ringOffset = computed(() => {
    const rm = this.roadmap();
    if (!rm || !this.animateRing()) return this.RING_CIRC;
    return this.RING_CIRC * (1 - rm.overallProgress / 100);
  });

  readonly totalTopics = computed(() =>
    (this.roadmap()?.weeks ?? []).reduce((sum, w) => sum + w.topics.length, 0),
  );

  readonly completedTopics = computed(() =>
    (this.roadmap()?.weeks ?? []).reduce(
      (sum, w) => sum + w.topics.filter((t) => t.isCompleted).length,
      0,
    ),
  );

  readonly weeksRemaining = computed(() => {
    const rm = this.roadmap();
    if (!rm) return '—';
    const now = Date.now();
    const remaining = rm.weeks.filter((w) => new Date(w.endDate).getTime() >= now).length;
    return remaining;
  });

  ngOnInit(): void {
    // Check if roadmap was passed via router state (from generator)
    const state = window.history.state as { roadmap?: StudyRoadmap };
    if (state?.roadmap) {
      this.roadmap.set(state.roadmap);
      this.isLoading.set(false);
      this.openCurrentWeek();
      setTimeout(() => this.animateRing.set(true), 400);
      return;
    }

    // Otherwise fetch from API
    this.roadmapService
      .getCurrent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.roadmap.set(res.data);
          this.isLoading.set(false);
          this.openCurrentWeek();
          setTimeout(() => this.animateRing.set(true), 400);
        },
        error: () => this.isLoading.set(false),
      });
  }

  toggleView(): void {
    this.view.update((v) => (v === 'list' ? 'timeline' : 'list'));
  }

  toggleWeek(weekId: string): void {
    this.expandedWeeks.update((set) => {
      const next = new Set(set);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  }

  toggleTopic(weekId: string, topic: RoadmapTopic): void {
    const newVal = !topic.isCompleted;

    // Optimistic update
    this.roadmap.update((rm) => {
      if (!rm) return rm;
      return {
        ...rm,
        weeks: rm.weeks.map((w) =>
          w._id !== weekId
            ? w
            : {
                ...w,
                topics: w.topics.map((t) =>
                  t._id !== topic._id ? t : { ...t, isCompleted: newVal },
                ),
              },
        ),
      };
    });

    // Persist to API
    this.roadmapService
      .updateTopicStatus(topic._id, newVal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          // Update overall progress from server response
          this.roadmap.update((rm) =>
            rm ? { ...rm, overallProgress: res.data.overallProgress } : rm,
          );
        },
        error: () => {
          // Revert on failure
          this.roadmap.update((rm) => {
            if (!rm) return rm;
            return {
              ...rm,
              weeks: rm.weeks.map((w) =>
                w._id !== weekId
                  ? w
                  : {
                      ...w,
                      topics: w.topics.map((t) =>
                        t._id !== topic._id ? t : { ...t, isCompleted: !newVal },
                      ),
                    },
              ),
            };
          });
          this.error.set('Failed to save. Please try again.');
        },
      });
  }

  regenerate(): void {
    if (this.isRegenerating()) return;
    this.isRegenerating.set(true);
    this.error.set(null);

    this.roadmapService
      .regenerate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.roadmap.set(res.data);
          this.isRegenerating.set(false);
          this.expandedWeeks.set(new Set());
          this.animateRing.set(false);
          this.openCurrentWeek();
          setTimeout(() => this.animateRing.set(true), 400);
        },
        error: (err) => {
          this.isRegenerating.set(false);
          this.error.set(err?.error?.error ?? 'Regeneration failed. Please try again.');
        },
      });
  }

  goToGenerator(): void {
    this.router.navigate(['/roadmap', 'generate']);
  }

  isCurrentWeek(week: RoadmapWeek): boolean {
    const now = Date.now();
    return (
      new Date(week.startDate).getTime() <= now && new Date(week.endDate).getTime() >= now
    );
  }

  weekProgress(week: RoadmapWeek): number {
    if (week.topics.length === 0) return 0;
    const done = week.topics.filter((t) => t.isCompleted).length;
    return Math.round((done / week.topics.length) * 100);
  }

  weekBadgeStyle(week: RoadmapWeek): string {
    if (week.isCompleted) return 'rgba(6,214,160,0.2)';
    if (this.isCurrentWeek(week)) return 'rgba(255,107,53,0.25)';
    return 'rgba(255,255,255,0.08)';
  }

  weekSubjectSummary(week: RoadmapWeek): Array<{ subject: string; total: number; completed: number }> {
    const map = new Map<string, { total: number; completed: number }>();
    for (const t of week.topics) {
      const entry = map.get(t.subject) ?? { total: 0, completed: 0 };
      entry.total++;
      if (t.isCompleted) entry.completed++;
      map.set(t.subject, entry);
    }
    return Array.from(map.entries()).map(([subject, v]) => ({ subject, ...v }));
  }

  subjectColour(subject: string): string {
    const COLOURS: Record<string, string> = {
      Physics: '#4CC9F0',
      Chemistry: '#7B2FBE',
      Biology: '#06D6A0',
      Mathematics: '#FF6B35',
      Math: '#FF6B35',
      History: '#F4A261',
      Geography: '#2DC653',
      Polity: '#E94560',
      Economy: '#FFD166',
      'Science & Technology': '#4CC9F0',
      'Current Affairs': '#A8DADC',
      Verbal: '#7B2FBE',
      'Data Interpretation': '#FF6B35',
      'Logical Reasoning': '#4CC9F0',
      'Quantitative Aptitude': '#06D6A0',
      English: '#F4A261',
      'General Knowledge': '#FFD166',
      Reasoning: '#4CC9F0',
    };
    // Fallback: hash subject name to a colour
    return COLOURS[subject] ?? '#FF6B35';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  private openCurrentWeek(): void {
    const rm = this.roadmap();
    if (!rm) return;
    const current = rm.weeks.find((w) => this.isCurrentWeek(w));
    if (current) {
      this.expandedWeeks.update((set) => {
        const next = new Set(set);
        next.add(current._id);
        return next;
      });
    } else if (rm.weeks.length > 0) {
      // Open first incomplete week
      const first = rm.weeks.find((w) => !w.isCompleted) ?? rm.weeks[0];
      this.expandedWeeks.update((set) => {
        const next = new Set(set);
        next.add(first._id);
        return next;
      });
    }
  }
}
