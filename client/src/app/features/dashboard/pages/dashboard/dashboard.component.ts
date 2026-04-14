import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardData, TodayTopic } from '../../../../core/models/dashboard.model';
import { Exam, Difficulty } from '../../../../core/models/question.model';

const RING_RADIUS = 40;
const RING_CIRC = 2 * Math.PI * RING_RADIUS; // 251.3

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5 p-4 md:p-6 pb-24">

      <!-- ── Loading skeletons ─────────────────────────────────────────── -->
      @if (isLoading()) {
        <div class="flex items-center justify-between">
          <div class="skeleton h-8 w-48 rounded-xl"></div>
          <div class="skeleton h-10 w-10 rounded-full"></div>
        </div>
        @for (i of [1,2,3]; track i) {
          <div class="skeleton h-28 w-full rounded-2xl"></div>
        }
        <div class="flex gap-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton h-20 flex-1 rounded-2xl"></div>
          }
        </div>
        @for (i of [1,2]; track i) {
          <div class="skeleton h-40 w-full rounded-2xl"></div>
        }
      }

      <!-- ── Error state ───────────────────────────────────────────────── -->
      @if (!isLoading() && error()) {
        <div class="error-state glass-card p-8">
          <span class="text-4xl">😕</span>
          <p class="text-white font-semibold">Could not load dashboard</p>
          <p class="text-white/40 text-sm">{{ error() }}</p>
          <button class="btn-primary px-6 mt-2" (click)="load()">Retry</button>
        </div>
      }

      @if (!isLoading() && data()) {

        <!-- ── 1. Header ─────────────────────────────────────────────── -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-col gap-0.5">
            <h1 class="font-heading font-bold text-xl md:text-2xl text-white leading-tight">
              Namaste, {{ firstName() }}! 🙏
            </h1>
            @if (data()!.user.streak.current > 0) {
              <div class="flex items-center gap-1.5">
                <span class="text-sm">🔥</span>
                <span class="text-sm font-semibold text-orange-400">
                  {{ data()!.user.streak.current }} day streak
                </span>
              </div>
            } @else {
              <p class="text-white/40 text-sm">Start your streak today!</p>
            }
          </div>

          <div class="flex items-center gap-3">
            <!-- Notification bell -->
            <button type="button"
              class="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors"
              aria-label="Notifications">
              <span class="text-xl">🔔</span>
              @if (data()!.spacedRepetitionCount > 0) {
                <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400"></span>
              }
            </button>

            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 cursor-pointer"
              style="background: linear-gradient(135deg, #FF6B35, #E94560);"
              [attr.aria-label]="'Profile: ' + data()!.user.name"
              [routerLink]="['/profile']">
              {{ avatarInitials() }}
            </div>
          </div>
        </div>

        <!-- ── 2. Exam Countdown Card ─────────────────────────────────── -->
        @if (data()!.examCountdown) {
          <div class="glass-card p-5 flex items-center gap-5"
            style="background: linear-gradient(135deg, rgba(255,107,53,0.08), rgba(233,69,96,0.08));">

            <!-- Readiness ring -->
            <div class="shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96" aria-label="Readiness progress">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
                <circle cx="48" cy="48" r="40" fill="none"
                  stroke="url(#dashGrad)" stroke-width="8" stroke-linecap="round"
                  [attr.stroke-dasharray]="ringCirc"
                  [style.stroke-dashoffset]="ringOffset()"
                  [style.transition]="'stroke-dashoffset 1.2s ease-out'"
                  transform="rotate(-90 48 48)"/>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#FF6B35"/>
                    <stop offset="100%" stop-color="#E94560"/>
                  </linearGradient>
                </defs>
                <text x="48" y="44" text-anchor="middle" fill="white"
                  font-family="Poppins,sans-serif" font-size="16" font-weight="700">
                  {{ data()!.examCountdown!.readinessPercent }}%
                </text>
                <text x="48" y="57" text-anchor="middle" fill="rgba(255,255,255,0.4)"
                  font-family="Inter,sans-serif" font-size="8">
                  ready
                </text>
              </svg>
            </div>

            <!-- Info -->
            <div class="flex flex-col gap-2 flex-1 min-w-0">
              <div class="flex flex-col gap-0.5">
                <p class="text-white/40 text-xs">Target Exam</p>
                <p class="font-heading font-bold text-white text-lg leading-tight">
                  {{ data()!.examCountdown!.exam }}
                </p>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="font-bold text-3xl text-gradient">
                  {{ data()!.examCountdown!.daysRemaining }}
                </span>
                <span class="text-white/40 text-sm">days remaining</span>
              </div>
              <p class="text-white/30 text-xs">{{ examDateFormatted() }}</p>
              <a [routerLink]="['/roadmap']"
                class="btn-primary py-2 text-xs text-center mt-1 inline-block">
                Continue Study Plan →
              </a>
            </div>
          </div>
        } @else {
          <!-- No exam set -->
          <div class="glass-card p-5 flex items-center gap-4">
            <span class="text-3xl">🎯</span>
            <div class="flex flex-col gap-1 flex-1">
              <p class="font-semibold text-white">Set your target exam</p>
              <p class="text-white/40 text-sm">Get a personalised study plan and countdown</p>
            </div>
            <a [routerLink]="['/profile']" class="btn-primary py-2 px-4 text-sm shrink-0">
              Set Exam
            </a>
          </div>
        }

        <!-- ── 3. Quick Stats Row ─────────────────────────────────────── -->
        <div class="flex flex-wrap gap-3">
          @for (stat of statsCards(); track stat.label) {
            <div class="glass-card flex flex-col items-center gap-1.5 py-4 px-3"
              style="flex: 1 1 130px;">
              <span class="text-2xl">{{ stat.icon }}</span>
              <span class="font-bold text-xl text-white">{{ stat.value }}</span>
              <span class="text-xs text-white/40 text-center leading-tight">{{ stat.label }}</span>
            </div>
          }
        </div>

        <!-- ── Upgrade Banner (free plan only) ──────────────────────── -->
        @if (isFreePlan()) {
          <div class="flex items-center gap-4 p-4 rounded-2xl"
            style="background: linear-gradient(135deg, rgba(255,107,53,0.08), rgba(233,69,96,0.08)); border: 1px solid rgba(255,107,53,0.2);">
            <span class="text-2xl shrink-0">⚡</span>
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <p class="font-semibold text-white text-sm">You're on the Free plan</p>
              <p class="text-white/40 text-xs">Unlock unlimited questions, all subjects, AI roadmap & doubt solver</p>
            </div>
            <a [routerLink]="['/pricing']"
              class="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white whitespace-nowrap"
              style="background: linear-gradient(135deg, #ff6b35, #e94560);">
              Upgrade →
            </a>
          </div>
        }

        <!-- ── 4. Today's Study Plan ─────────────────────────────────── -->
        <div class="glass-card p-5 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">📅</span>
              <p class="font-semibold text-white">Today's Plan</p>
            </div>
            @if (data()!.todaysPlan.totalCount > 0) {
              <span class="text-xs text-white/40">
                {{ todayCheckedCount() }}/{{ data()!.todaysPlan.totalCount }} done
              </span>
            }
          </div>

          @if (data()!.todaysPlan.totalCount === 0) {
            <div class="flex flex-col items-center gap-2 py-4 text-center">
              <span class="text-3xl">🗓️</span>
              <p class="text-white/50 text-sm">No topics scheduled for today</p>
              <a [routerLink]="['/roadmap']" class="text-primary text-sm font-medium">
                Generate study roadmap →
              </a>
            </div>
          } @else {
            <!-- Progress bar -->
            <div class="flex flex-col gap-1.5">
              <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700"
                  style="background: linear-gradient(90deg, #FF6B35, #E94560);"
                  [style.width]="todayProgress() + '%'">
                </div>
              </div>
            </div>

            <!-- Topic list -->
            <div class="flex flex-col gap-2">
              @for (topic of data()!.todaysPlan.topics; track topic._id) {
                <div class="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer"
                  [style.background]="isChecked(topic._id) ? 'rgba(6,214,160,0.06)' : 'rgba(255,255,255,0.03)'"
                  (click)="toggleCheck(topic._id)">
                  <!-- Checkbox -->
                  <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200"
                    [style.border-color]="isChecked(topic._id) ? '#06D6A0' : 'rgba(255,255,255,0.2)'"
                    [style.background]="isChecked(topic._id) ? '#06D6A0' : 'transparent'">
                    @if (isChecked(topic._id)) {
                      <span class="text-xs text-[#0F0F1A] font-bold">✓</span>
                    }
                  </div>

                  <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span class="text-sm font-medium text-white/90 truncate"
                      [class.line-through]="isChecked(topic._id)"
                      [class.text-white]="!isChecked(topic._id)"
                      [class.opacity-50]="isChecked(topic._id)">
                      {{ topic.topic }}
                    </span>
                    <span class="text-xs text-white/30">{{ topic.subject }} · {{ topic.estimatedHours }}h</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── 5. Weak Areas + Right column ──────────────────────────── -->
        <div class="flex flex-col lg:flex-row gap-4">

          <!-- Weak areas alert card -->
          <div class="glass-card p-5 flex flex-col gap-4 flex-1"
            style="border-color: rgba(239,71,111,0.2);">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚠️</span>
              <p class="font-semibold text-white">Weak Areas</p>
              @if (data()!.weakAreas.length > 0) {
                <span class="ml-auto text-xs px-2 py-0.5 rounded-full text-red-400"
                  style="background: rgba(239,71,111,0.12);">
                  Needs attention
                </span>
              }
            </div>

            @if (data()!.weakAreas.length === 0) {
              <div class="flex flex-col items-center gap-2 py-4 text-center">
                <span class="text-3xl">🎉</span>
                <p class="text-white/50 text-sm">No weak areas! Take more tests to identify them.</p>
              </div>
            } @else {
              <div class="flex flex-col gap-3">
                @for (area of data()!.weakAreas; track area._id) {
                  <div class="flex items-center gap-3 p-3 rounded-xl"
                    style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">

                    <!-- Priority dot -->
                    <div class="w-2 h-2 rounded-full shrink-0"
                      [style.background]="priorityColour(area.priority)"></div>

                    <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span class="text-sm font-medium text-white truncate">{{ area.topic }}</span>
                      <span class="text-xs text-white/40">{{ area.subject }} · {{ area.accuracy }}% accuracy</span>
                    </div>

                    <button type="button"
                      class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                      style="background: rgba(255,107,53,0.15); color: #FF6B35;"
                      (click)="practiceWeakArea(area)">
                      Practice
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Right column: Spaced Rep + Daily Challenge -->
          <div class="flex flex-col gap-4 lg:w-72">

            <!-- ── 6. Spaced Repetition Reminder ──────────────────────── -->
            <div class="glass-card p-4 flex flex-col gap-3"
              [style.border-color]="data()!.spacedRepetitionCount > 0 ? 'rgba(255,209,102,0.3)' : 'rgba(255,255,255,0.08)'">
              <div class="flex items-center gap-2">
                <span class="text-lg">🧠</span>
                <p class="font-semibold text-white text-sm">Spaced Repetition</p>
              </div>
              @if (data()!.spacedRepetitionCount > 0) {
                <p class="text-sm text-white/60">
                  <span class="text-yellow-400 font-bold">{{ data()!.spacedRepetitionCount }}</span>
                  question{{ data()!.spacedRepetitionCount !== 1 ? 's' : '' }} due for review
                </p>
                <a [routerLink]="['/tests', 'generate']"
                  class="btn-primary py-2 text-sm text-center">
                  Start Review →
                </a>
              } @else {
                <p class="text-sm text-white/40">All caught up! No reviews due today. 🎯</p>
              }
            </div>

            <!-- ── 9. Daily Challenge Card ─────────────────────────────── -->
            <div class="glass-card p-4 flex flex-col gap-3"
              style="background: linear-gradient(135deg, rgba(155,93,229,0.1), rgba(118,57,196,0.05)); border-color: rgba(155,93,229,0.2);">
              <div class="flex items-center gap-2">
                <span class="text-lg">⚡</span>
                <p class="font-semibold text-white text-sm">Daily Challenge</p>
                @if (data()!.user.streak.current > 0) {
                  <span class="ml-auto text-xs font-bold text-yellow-400">🔥 Streak bonus!</span>
                }
              </div>
              <p class="text-sm text-white/60">5 handpicked questions today. Complete to maintain your streak.</p>
              <a [routerLink]="['/tests', 'generate']"
                class="py-2 rounded-xl text-sm font-semibold text-center transition-all duration-200"
                style="background: rgba(155,93,229,0.2); color: #9B5DE5; border: 1px solid rgba(155,93,229,0.3);">
                Accept Challenge →
              </a>
            </div>
          </div>
        </div>

        <!-- ── 7 + 8. Recent Tests + Leaderboard ─────────────────────── -->
        <div class="flex flex-col lg:flex-row gap-4">

          <!-- Recent Tests -->
          <div class="glass-card p-5 flex flex-col gap-4 flex-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">📊</span>
                <p class="font-semibold text-white">Recent Tests</p>
              </div>
              <a [routerLink]="['/results']" class="text-primary text-xs font-medium">View All →</a>
            </div>

            @if (data()!.recentTests.length === 0) {
              <div class="flex flex-col items-center gap-2 py-6 text-center">
                <span class="text-3xl">📝</span>
                <p class="text-white/50 text-sm">No tests taken yet</p>
                <a [routerLink]="['/tests', 'generate']" class="text-primary text-sm font-medium">
                  Take your first test →
                </a>
              </div>
            } @else {
              <div class="flex flex-col gap-2">
                @for (test of data()!.recentTests; track test._id) {
                  <a [routerLink]="['/tests', 'result', test._id]"
                    class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <!-- Score badge -->
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      [style.background]="accuracyBg(test.accuracy)"
                      [style.color]="accuracyColour(test.accuracy)">
                      {{ test.accuracy }}%
                    </div>

                    <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span class="text-sm font-medium text-white truncate">
                        {{ test.exam }} · {{ test.subject }}
                      </span>
                      <span class="text-xs text-white/30">
                        {{ test.correctCount }}/{{ test.totalQuestions }} correct ·
                        {{ formatDate(test.createdAt) }}
                      </span>
                    </div>

                    <span class="text-xs capitalize px-2 py-0.5 rounded-full shrink-0"
                      [style.background]="difficultyBg(test.difficulty)"
                      [style.color]="difficultyColour(test.difficulty)">
                      {{ test.difficulty }}
                    </span>
                  </a>
                }
              </div>
            }
          </div>

          <!-- ── 8. Leaderboard Preview ─────────────────────────────── -->
          <div class="glass-card p-5 flex flex-col gap-4 lg:w-72">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">🏆</span>
                <p class="font-semibold text-white">Leaderboard</p>
              </div>
              <a [routerLink]="['/study-groups']" class="text-primary text-xs font-medium">
                View →
              </a>
            </div>

            @if (data()!.leaderboardPreview.topStudents.length === 0) {
              <div class="flex flex-col items-center gap-3 py-4 text-center">
                <span class="text-3xl">👥</span>
                <p class="text-white/50 text-sm">Join a study group to compete with friends</p>
                <a [routerLink]="['/study-groups']"
                  class="btn-primary py-2 px-4 text-sm">
                  Join a Group
                </a>
              </div>
            } @else {
              <div class="flex flex-col gap-2">
                @for (student of data()!.leaderboardPreview.topStudents; track student.rank) {
                  <div class="flex items-center gap-3 p-2.5 rounded-xl"
                    style="background: rgba(255,255,255,0.03);">
                    <span class="text-base w-6 text-center shrink-0">
                      {{ student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉' }}
                    </span>
                    <span class="text-sm text-white flex-1 truncate">{{ student.name }}</span>
                    <span class="text-sm font-bold text-primary">{{ student.accuracy }}%</span>
                  </div>
                }
                @if (data()!.leaderboardPreview.myRank) {
                  <div class="flex items-center gap-3 p-2.5 rounded-xl mt-1"
                    style="background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.2);">
                    <span class="text-sm w-6 text-center font-bold text-primary shrink-0">
                      #{{ data()!.leaderboardPreview.myRank }}
                    </span>
                    <span class="text-sm text-white flex-1">You</span>
                    <span class="text-sm font-bold text-white">{{ data()!.stats.avgAccuracy }}%</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

      } <!-- end @if data -->
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<DashboardData | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly checkedTopics = signal<Set<string>>(new Set());
  readonly animateRing = signal(false);

  readonly ringCirc = RING_CIRC;

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly firstName = computed(() => {
    const name = this.data()?.user.name ?? this.authService.currentUser()?.name ?? 'Student';
    return name.split(' ')[0];
  });

  readonly avatarInitials = computed(() => {
    const name = this.data()?.user.name ?? 'S';
    return name.slice(0, 2).toUpperCase();
  });

  readonly ringOffset = computed(() => {
    if (!this.animateRing() || !this.data()?.examCountdown) return RING_CIRC;
    return RING_CIRC * (1 - this.data()!.examCountdown!.readinessPercent / 100);
  });

  readonly isFreePlan = computed(() =>
    (this.data()?.user.subscription?.plan ?? 'free') === 'free',
  );

  readonly statsCards = computed(() => {
    const s = this.data()?.stats;
    if (!s) return [];
    return [
      { icon: '📝', value: s.testsTaken, label: 'Tests Taken' },
      { icon: '🎯', value: s.avgAccuracy + '%', label: 'Avg Accuracy' },
      { icon: '✅', value: s.questionsSolved, label: 'Questions Solved' },
      { icon: '🔥', value: s.studyStreak, label: 'Day Streak' },
    ];
  });

  readonly todayCheckedCount = computed(() => {
    const topics = this.data()?.todaysPlan.topics ?? [];
    return topics.filter((t) => this.isChecked(t._id)).length;
  });

  readonly todayProgress = computed(() => {
    const total = this.data()?.todaysPlan.totalCount ?? 0;
    if (!total) return 0;
    return Math.round((this.todayCheckedCount() / total) * 100);
  });

  readonly examDateFormatted = computed(() => {
    const d = this.data()?.examCountdown?.examDate;
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService
      .getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          // Sync server-side completed topics into local checked state
          const serverChecked = new Set<string>(
            res.data.todaysPlan.topics
              .filter((t) => t.isCompleted)
              .map((t) => t._id),
          );
          this.checkedTopics.set(serverChecked);
          this.isLoading.set(false);
          // Trigger ring animation after a short delay
          setTimeout(() => this.animateRing.set(true), 400);
        },
        error: (err) => {
          this.error.set(err?.error?.error ?? 'Failed to load dashboard');
          this.isLoading.set(false);
        },
      });
  }

  // ── Topic checkbox ────────────────────────────────────────────────────────
  isChecked(id: string): boolean {
    return this.checkedTopics().has(id);
  }

  toggleCheck(id: string): void {
    this.checkedTopics.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Navigation helpers ────────────────────────────────────────────────────
  practiceWeakArea(area: DashboardData['weakAreas'][number]): void {
    this.router.navigate(['/tests', 'generate'], {
      state: {
        prefill: {
          exam: area.exam as Exam,
          subject: area.subject,
          difficulty: 'medium' as Difficulty,
        },
      },
    });
  }

  // ── Style helpers ─────────────────────────────────────────────────────────
  priorityColour(priority: string): string {
    if (priority === 'critical') return '#EF476F';
    if (priority === 'moderate') return '#FFD166';
    return '#06D6A0';
  }

  accuracyColour(accuracy: number): string {
    if (accuracy >= 70) return '#06D6A0';
    if (accuracy >= 40) return '#FFD166';
    return '#EF476F';
  }

  accuracyBg(accuracy: number): string {
    if (accuracy >= 70) return 'rgba(6,214,160,0.12)';
    if (accuracy >= 40) return 'rgba(255,209,102,0.12)';
    return 'rgba(239,71,111,0.12)';
  }

  difficultyColour(d: string): string {
    if (d === 'easy') return '#06D6A0';
    if (d === 'hard') return '#EF476F';
    return '#FFD166';
  }

  difficultyBg(d: string): string {
    if (d === 'easy') return 'rgba(6,214,160,0.12)';
    if (d === 'hard') return 'rgba(239,71,111,0.12)';
    return 'rgba(255,209,102,0.12)';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }
}
