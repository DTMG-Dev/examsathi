import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

interface TestHistoryItem {
  id: string;
  exam: string;
  subject: string;
  topic: string;
  date: string;
  score: number;
  accuracy: number;
  totalQuestions: number;
  correct: number;
  timeTaken: number; // minutes
  icon: string;
  colour: string;
}

@Component({
  selector: 'app-results-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-16">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex flex-col gap-1">
          <h1 class="font-heading font-bold text-2xl text-white">My Results</h1>
          <p class="text-white/50 text-sm">Track your performance over time</p>
        </div>
        <button type="button" class="btn-primary px-5 py-2.5 text-sm"
          (click)="router.navigate(['/test-engine','generate'])">
          ✨ New Test
        </button>
      </div>

      <!-- Summary cards -->
      <div class="flex gap-3 flex-wrap">
        @for (s of SUMMARY; track s.label) {
          <div class="glass-card p-4 flex flex-col gap-1 flex-1" style="min-width: 110px;">
            <span class="text-xl">{{ s.icon }}</span>
            <span class="font-heading font-bold text-xl text-white">{{ s.value }}</span>
            <span class="text-xs text-white/40">{{ s.label }}</span>
          </div>
        }
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2 flex-wrap">
        @for (tab of TABS; track tab) {
          <button type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            [style.background]="activeTab() === tab ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)'"
            [style.color]="activeTab() === tab ? '#FF6B35' : 'rgba(255,255,255,0.5)'"
            (click)="activeTab.set(tab)">
            {{ tab }}
          </button>
        }
      </div>

      <!-- Result rows -->
      <div class="flex flex-col gap-3">
        @for (item of filtered(); track item.id) {
          <div class="glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-white/15 transition-all duration-200"
            (click)="router.navigate(['/results', item.id])">

            <!-- Icon -->
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
              [style.background]="item.colour + '20'">
              {{ item.icon }}
            </div>

            <!-- Info -->
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <span class="font-semibold text-white text-sm truncate">{{ item.topic }}</span>
              <span class="text-xs text-white/40">
                {{ item.exam }} · {{ item.subject }} · {{ item.date }}
              </span>
            </div>

            <!-- Score -->
            <div class="flex flex-col items-end gap-0.5 shrink-0">
              <span class="font-bold text-lg"
                [style.color]="scoreColour(item.accuracy)">
                {{ item.accuracy }}%
              </span>
              <span class="text-xs text-white/30">
                {{ item.correct }}/{{ item.totalQuestions }} · {{ item.timeTaken }}m
              </span>
            </div>

            <span class="text-white/20 text-lg shrink-0">›</span>
          </div>
        }

        @if (filtered().length === 0) {
          <div class="flex flex-col items-center gap-3 py-16 text-center">
            <span class="text-4xl">📭</span>
            <p class="text-white/50 text-sm">No results for this filter</p>
          </div>
        }
      </div>

    </div>
  `,
})
export class ResultsListComponent {
  readonly router = inject(Router);
  readonly activeTab = signal<string>('All');

  readonly TABS = ['All', 'NEET', 'JEE', 'UPSC', 'CAT', 'SSC'];

  readonly SUMMARY = [
    { icon: '📝', value: '24',  label: 'Tests taken' },
    { icon: '🎯', value: '71%', label: 'Avg accuracy' },
    { icon: '✅', value: '432', label: 'Correct answers' },
    { icon: '⏱️', value: '18h', label: 'Time spent' },
  ];

  readonly HISTORY: TestHistoryItem[] = [
    { id: '1', exam: 'NEET', subject: 'Biology',    topic: 'Cell Biology',        date: '12 Apr 2026', score: 73, accuracy: 73, totalQuestions: 30, correct: 22, timeTaken: 28, icon: '🔬', colour: '#06D6A0' },
    { id: '2', exam: 'NEET', subject: 'Physics',    topic: 'Laws of Motion',      date: '11 Apr 2026', score: 52, accuracy: 52, totalQuestions: 25, correct: 13, timeTaken: 24, icon: '⚡', colour: '#4CC9F0' },
    { id: '3', exam: 'JEE',  subject: 'Math',       topic: 'Integral Calculus',   date: '10 Apr 2026', score: 60, accuracy: 60, totalQuestions: 20, correct: 12, timeTaken: 29, icon: '📐', colour: '#FF6B35' },
    { id: '4', exam: 'NEET', subject: 'Chemistry',  topic: 'Electrochemistry',    date: '9 Apr 2026',  score: 80, accuracy: 80, totalQuestions: 20, correct: 16, timeTaken: 18, icon: '🧪', colour: '#7B2FBE' },
    { id: '5', exam: 'UPSC', subject: 'History',    topic: 'Ancient India',       date: '8 Apr 2026',  score: 84, accuracy: 84, totalQuestions: 25, correct: 21, timeTaken: 22, icon: '🏛️', colour: '#FFD166' },
    { id: '6', exam: 'SSC',  subject: 'GK',         topic: 'Indian Geography',    date: '7 Apr 2026',  score: 88, accuracy: 88, totalQuestions: 25, correct: 22, timeTaken: 19, icon: '🗺️', colour: '#06D6A0' },
    { id: '7', exam: 'CAT',  subject: 'VARC',       topic: 'Reading Comprehension',date: '6 Apr 2026', score: 65, accuracy: 65, totalQuestions: 20, correct: 13, timeTaken: 25, icon: '📚', colour: '#7B2FBE' },
    { id: '8', exam: 'JEE',  subject: 'Physics',    topic: 'Modern Physics',      date: '5 Apr 2026',  score: 55, accuracy: 55, totalQuestions: 15, correct: 8,  timeTaken: 18, icon: '⚛️', colour: '#4CC9F0' },
  ];

  readonly filtered = computed(() => {
    const tab = this.activeTab();
    if (tab === 'All') return this.HISTORY;
    return this.HISTORY.filter((h) => h.exam === tab);
  });

  scoreColour(acc: number): string {
    if (acc >= 80) return '#06D6A0';
    if (acc >= 60) return '#FFD166';
    return '#E94560';
  }
}

