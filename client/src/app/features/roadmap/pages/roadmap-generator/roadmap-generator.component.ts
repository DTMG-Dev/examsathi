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
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-roadmap-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-10">

      <!-- ── Generating state ────────────────────────────────────────── -->
      @if (isGenerating()) {
        <div class="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div class="w-20 h-20 rounded-3xl flex items-center justify-center"
            style="background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(233,69,96,0.2));">
            <span class="text-4xl">🤖</span>
          </div>
          <div class="flex flex-col gap-2">
            <h2 class="font-heading font-bold text-xl text-white">
              AI is crafting your personalised plan…
            </h2>
            <p class="text-white/40 text-sm">
              Analysing your weak areas · Balancing subjects · Scheduling revision weeks
            </p>
          </div>
          <div class="ai-thinking" aria-label="Generating roadmap">
            <span></span><span></span><span></span>
          </div>
          <div class="flex flex-col gap-2 w-full max-w-xs">
            @for (step of generatingSteps; track step) {
              <div class="flex items-center gap-2 text-sm text-white/40">
                <span class="text-emerald-400">✓</span>
                <span>{{ step }}</span>
              </div>
            }
          </div>
          <p class="text-xs text-white/20">This usually takes 15–25 seconds</p>
        </div>
      }

      @if (!isGenerating()) {

        <!-- Header -->
        <div class="flex flex-col gap-1">
          <h1 class="font-heading font-bold text-2xl text-white">
            Your AI Study Roadmap
          </h1>
          <p class="text-white/50 text-sm">
            Claude AI will build a week-by-week plan based on your profile and weak areas
          </p>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="glass-card p-4 flex items-start gap-3"
            style="border-color: rgba(239,71,111,0.3); background: rgba(239,71,111,0.06);">
            <span class="text-xl shrink-0">⚠️</span>
            <div class="flex flex-col gap-1 flex-1">
              <p class="text-sm font-semibold text-red-400">Generation failed</p>
              <p class="text-xs text-white/50">{{ error() }}</p>
            </div>
            <button type="button" class="text-white/40 hover:text-white text-lg"
              (click)="error.set(null)">×</button>
          </div>
        }

        <!-- Exam profile card -->
        <div class="glass-card p-5 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="text-lg">🎯</span>
            <p class="font-semibold text-white">Exam Profile</p>
          </div>

          @if (!user()?.targetExam) {
            <div class="flex flex-col gap-2 text-center py-3">
              <p class="text-white/50 text-sm">No target exam set in your profile</p>
              <button type="button" class="text-primary text-sm font-medium"
                (click)="goToProfile()">
                Set target exam →
              </button>
            </div>
          } @else {
            <div class="flex flex-wrap gap-3">
              @for (item of profileItems(); track item.label) {
                <div class="flex flex-col gap-0.5 p-3 rounded-xl flex-1"
                  style="background: rgba(255,255,255,0.04); min-width: 110px;">
                  <span class="text-xs text-white/40">{{ item.label }}</span>
                  <span class="font-semibold text-white text-sm">{{ item.value }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Weak areas summary -->
        @if (isLoadingData()) {
          <div class="skeleton h-32 rounded-2xl"></div>
        } @else if (weakAreas().length > 0) {
          <div class="glass-card p-5 flex flex-col gap-3"
            style="border-color: rgba(239,71,111,0.15);">
            <div class="flex items-center gap-2">
              <span class="text-lg">⚠️</span>
              <p class="font-semibold text-white text-sm">AI will prioritise these weak areas</p>
            </div>
            <div class="flex flex-col gap-2">
              @for (wa of weakAreas().slice(0, 5); track wa._id) {
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full shrink-0"
                    [style.background]="priorityColour(wa.priority)"></div>
                  <span class="text-sm text-white/70">{{ wa.subject }} · {{ wa.topic }}</span>
                  <span class="ml-auto text-xs font-bold"
                    [style.color]="priorityColour(wa.priority)">{{ wa.accuracy }}%</span>
                </div>
              }
              @if (weakAreas().length > 5) {
                <p class="text-xs text-white/30">+{{ weakAreas().length - 5 }} more</p>
              }
            </div>
          </div>
        } @else {
          <div class="glass-card p-4 flex items-center gap-3"
            style="border-color: rgba(6,214,160,0.2);">
            <span class="text-xl">🎉</span>
            <p class="text-sm text-white/60">
              No weak areas yet — take a few tests and AI will personalise your plan
            </p>
          </div>
        }

        <!-- What AI generates -->
        <div class="glass-card p-5 flex flex-col gap-3">
          <p class="text-sm font-semibold text-white/60">What you'll get</p>
          <div class="flex flex-col gap-2">
            @for (item of FEATURES; track item) {
              <div class="flex items-center gap-2 text-sm text-white/70">
                <span class="text-emerald-400 shrink-0">✓</span>
                <span>{{ item }}</span>
              </div>
            }
          </div>
        </div>

        <!-- CTA -->
        <button type="button"
          class="btn-primary py-4 text-base"
          (click)="generate()"
          [disabled]="!canGenerate() || isGenerating()">
          <span class="text-lg">✨</span>
          Generate My Roadmap
        </button>

        @if (!canGenerate()) {
          <p class="text-center text-xs text-white/30">
            Set your target exam and exam date in your profile to generate a roadmap
          </p>
        }
      }

    </div>
  `,
})
export class RoadmapGeneratorComponent implements OnInit {
  private readonly roadmapService = inject(RoadmapService);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isGenerating = signal(false);
  readonly isLoadingData = signal(true);
  readonly error = signal<string | null>(null);
  readonly weakAreas = signal<Array<{ _id: string; subject: string; topic: string; accuracy: number; priority: string }>>([]);

  readonly user = computed(() => this.authService.currentUser());

  readonly canGenerate = computed(
    () => !!this.user()?.targetExam && !!this.user()?.examDate,
  );

  readonly profileItems = computed(() => {
    const u = this.user();
    if (!u) return [];
    return [
      { label: 'Target Exam', value: u.targetExam ?? '—' },
      {
        label: 'Exam Date',
        value: u.examDate
          ? new Date(u.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
      },
      { label: 'Daily Hours', value: `${u.dailyStudyHours}h` },
      {
        label: 'Days Left',
        value: u.examDate
          ? String(Math.max(0, Math.ceil((new Date(u.examDate).getTime() - Date.now()) / 86400000)))
          : '—',
      },
    ];
  });

  readonly FEATURES = [
    'Week-by-week structured plan until your exam date',
    'Weak areas prioritised in the first 60% of the plan',
    'Balanced subject coverage every week',
    'Revision + mock test weeks before exam',
    'NCERT-aligned topic scheduling',
  ];

  readonly generatingSteps = [
    'Analysing your exam profile',
    'Identifying weak areas to focus',
    'Balancing subjects week by week',
    'Scheduling revision weeks',
    'Finalising your personalised plan',
  ];

  ngOnInit(): void {
    // Load weak areas for preview
    this.dashboardService
      .getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.weakAreas.set(res.data.weakAreas);
          this.isLoadingData.set(false);
        },
        error: () => this.isLoadingData.set(false),
      });
  }

  generate(): void {
    if (!this.canGenerate() || this.isGenerating()) return;
    this.isGenerating.set(true);
    this.error.set(null);

    this.roadmapService
      .generate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isGenerating.set(false);
          this.router.navigate(['/roadmap', 'view'], {
            state: { roadmap: res.data },
          });
        },
        error: (err) => {
          this.isGenerating.set(false);
          this.error.set(err?.error?.error ?? 'Generation failed. Please try again.');
        },
      });
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  priorityColour(priority: string): string {
    if (priority === 'critical') return '#EF476F';
    if (priority === 'moderate') return '#FFD166';
    return '#06D6A0';
  }
}
