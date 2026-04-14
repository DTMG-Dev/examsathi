import {
  Component, ChangeDetectionStrategy, signal, computed,
  inject, OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface SubjectBreak { subject: string; correct: number; total: number; colour: string; }

@Component({
  selector: 'app-result-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-16">

      <!-- Back -->
      <button type="button" class="btn-ghost self-start -ml-2"
        (click)="router.navigate(['/results'])">
        ← Back to Results
      </button>

      <!-- Score hero -->
      <div class="glass-card p-6 flex items-center gap-6"
        style="background: linear-gradient(135deg, rgba(255,107,53,0.07), rgba(233,69,96,0.07));">

        <!-- SVG ring -->
        <svg width="96" height="96" viewBox="0 0 96 96" class="shrink-0">
          <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
          <circle cx="48" cy="48" r="38" fill="none"
            [attr.stroke]="ringColour()"
            stroke-width="8" stroke-linecap="round"
            [attr.stroke-dasharray]="CIRC"
            [attr.stroke-dashoffset]="offset()"
            transform="rotate(-90 48 48)"
            style="transition: stroke-dashoffset 1s ease-out"/>
          <text x="48" y="53" text-anchor="middle" fill="white"
            font-family="Poppins,sans-serif" font-size="18" font-weight="700">
            {{ RESULT.accuracy }}%
          </text>
        </svg>

        <div class="flex flex-col gap-2 flex-1">
          <h1 class="font-heading font-bold text-xl text-white">{{ RESULT.topic }}</h1>
          <p class="text-white/40 text-sm">{{ RESULT.exam }} · {{ RESULT.subject }} · {{ RESULT.date }}</p>
          <div class="flex flex-wrap gap-3 text-sm mt-1">
            <span style="color:#06D6A0">✓ {{ RESULT.correct }} correct</span>
            <span style="color:#E94560">✗ {{ RESULT.wrong }} wrong</span>
            <span class="text-white/30">— {{ RESULT.skipped }} skipped</span>
            <span class="text-white/30">⏱ {{ RESULT.timeTaken }}m</span>
          </div>
        </div>
      </div>

      <!-- Motivational message -->
      <div class="glass-card px-4 py-3 flex items-center gap-3">
        <span class="text-2xl">{{ motivationIcon() }}</span>
        <p class="text-sm text-white/70">{{ motivationMsg() }}</p>
      </div>

      <!-- Subject breakdown -->
      <div class="glass-card p-5 flex flex-col gap-4">
        <p class="font-semibold text-white text-sm">Subject Breakdown</p>
        @for (s of RESULT.breakdown; track s.subject) {
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" [style.background]="s.colour"></div>
                <span class="text-white/70">{{ s.subject }}</span>
              </div>
              <span class="font-semibold" [style.color]="s.colour">
                {{ Math.round(s.correct / s.total * 100) }}%
                <span class="text-white/30 font-normal">({{ s.correct }}/{{ s.total }})</span>
              </span>
            </div>
            <div class="h-2 rounded-full w-full" style="background:rgba(255,255,255,0.06)">
              <div class="h-2 rounded-full transition-all duration-700"
                [style.width]="(s.correct / s.total * 100) + '%'"
                [style.background]="s.colour">
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Time stats -->
      <div class="flex gap-3 flex-wrap">
        @for (s of TIME_STATS; track s.label) {
          <div class="glass-card p-4 flex flex-col gap-1 flex-1" style="min-width: 100px;">
            <span class="text-lg">{{ s.icon }}</span>
            <span class="font-bold text-white text-base">{{ s.value }}</span>
            <span class="text-xs text-white/40">{{ s.label }}</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex gap-3 flex-wrap">
        <button type="button" class="btn-primary flex-1"
          (click)="router.navigate(['/test-engine','review', RESULT.id])">
          📖 Review Solutions
        </button>
        <button type="button" class="btn-secondary flex-1"
          (click)="router.navigate(['/test-engine','generate'])">
          🔄 Retry Similar
        </button>
      </div>

    </div>
  `,
})
export class ResultDetailComponent implements OnInit {
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  readonly Math = Math;
  readonly CIRC = 2 * Math.PI * 38;
  readonly animated = signal(false);

  readonly offset = computed(() =>
    this.animated() ? this.CIRC * (1 - this.RESULT.accuracy / 100) : this.CIRC
  );

  readonly RESULT = {
    id: '1',
    exam: 'NEET', subject: 'Biology', topic: 'Cell Biology & Organelles',
    date: '12 Apr 2026', accuracy: 73, correct: 22, wrong: 6, skipped: 2,
    totalQuestions: 30, timeTaken: 28,
    breakdown: [
      { subject: 'Cell Structure',  correct: 8,  total: 10, colour: '#06D6A0' },
      { subject: 'Cell Division',   correct: 7,  total: 10, colour: '#4CC9F0' },
      { subject: 'Cell Organelles', correct: 7,  total: 10, colour: '#7B2FBE' },
    ] as SubjectBreak[],
  };

  readonly TIME_STATS = [
    { icon: '⏱️', value: '28m',   label: 'Total time' },
    { icon: '⚡', value: '56s',    label: 'Avg per Q' },
    { icon: '🚀', value: '12s',    label: 'Fastest Q' },
    { icon: '🐢', value: '2m 4s',  label: 'Slowest Q' },
  ];

  ngOnInit(): void {
    setTimeout(() => this.animated.set(true), 300);
  }

  ringColour(): string {
    const a = this.RESULT.accuracy;
    if (a >= 80) return '#06D6A0';
    if (a >= 60) return '#FFD166';
    return '#E94560';
  }

  motivationIcon(): string {
    const a = this.RESULT.accuracy;
    if (a >= 80) return '🏆';
    if (a >= 60) return '💪';
    return '📚';
  }

  motivationMsg(): string {
    const a = this.RESULT.accuracy;
    if (a >= 80) return 'Excellent work! You have a strong grasp of this topic.';
    if (a >= 60) return 'Good effort! A focused revision session will push you past 80%.';
    return 'Keep going! Review the solutions and try again — consistency is key.';
  }
}
