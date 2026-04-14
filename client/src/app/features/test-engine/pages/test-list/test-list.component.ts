import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

interface TestCard {
  id: string;
  exam: string;
  subject: string;
  topic: string;
  questions: number;
  duration: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  attempts: number;
  bestScore: number | null;
  icon: string;
  colour: string;
}

@Component({
  selector: 'app-test-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-16">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex flex-col gap-1">
          <h1 class="font-heading font-bold text-2xl text-white">Test Engine</h1>
          <p class="text-white/50 text-sm">AI-generated practice tests for your exam</p>
        </div>
        <button type="button" class="btn-primary px-5 py-2.5 text-sm"
          (click)="goGenerate()">
          ✨ Generate New Test
        </button>
      </div>

      <!-- Quick start exam chips -->
      <div class="flex gap-2 flex-wrap">
        @for (exam of EXAMS; track exam.id) {
          <button type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
            [style.border-color]="selectedExam() === exam.id ? exam.colour : 'rgba(255,255,255,0.1)'"
            [style.background]="selectedExam() === exam.id ? exam.colour + '20' : 'rgba(255,255,255,0.04)'"
            [style.color]="selectedExam() === exam.id ? exam.colour : 'rgba(255,255,255,0.5)'"
            (click)="selectedExam.set(exam.id)">
            {{ exam.icon }} {{ exam.id }}
          </button>
        }
      </div>

      <!-- Stats row -->
      <div class="flex gap-3 flex-wrap">
        @for (s of STATS; track s.label) {
          <div class="glass-card p-4 flex flex-col gap-1 flex-1" style="min-width: 110px;">
            <span class="text-xl">{{ s.icon }}</span>
            <span class="font-heading font-bold text-xl text-white">{{ s.value }}</span>
            <span class="text-xs text-white/40">{{ s.label }}</span>
          </div>
        }
      </div>

      <!-- Test cards -->
      <div class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-white/40 uppercase tracking-wider">Recommended Tests</p>

        @for (test of filteredTests(); track test.id) {
          <div class="glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-white/15 transition-all duration-200"
            (click)="startTest(test)">

            <!-- Icon -->
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
              [style.background]="test.colour + '20'">
              {{ test.icon }}
            </div>

            <!-- Info -->
            <div class="flex flex-col gap-1 flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-white text-sm">{{ test.topic }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  [style.background]="diffColour(test.difficulty) + '20'"
                  [style.color]="diffColour(test.difficulty)">
                  {{ test.difficulty }}
                </span>
              </div>
              <p class="text-xs text-white/40">
                {{ test.exam }} · {{ test.subject }} · {{ test.questions }} Qs · {{ test.duration }} min
              </p>
              @if (test.bestScore !== null) {
                <p class="text-xs" style="color: #06D6A0;">
                  Best: {{ test.bestScore }}% · {{ test.attempts }} attempt{{ test.attempts > 1 ? 's' : '' }}
                </p>
              } @else {
                <p class="text-xs text-white/30">Not attempted yet</p>
              }
            </div>

            <!-- Arrow -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-white/20 text-lg">›</span>
            </div>
          </div>
        }
      </div>

      <!-- CTA banner -->
      <div class="glass-card p-5 flex items-center gap-4"
        style="background: linear-gradient(135deg, rgba(255,107,53,0.08), rgba(233,69,96,0.08)); border-color: rgba(255,107,53,0.2);">
        <span class="text-3xl shrink-0">🤖</span>
        <div class="flex flex-col gap-1 flex-1">
          <p class="font-semibold text-white text-sm">Want a custom test?</p>
          <p class="text-xs text-white/50">
            Claude AI generates fresh MCQs on any topic you choose — instantly.
          </p>
        </div>
        <button type="button" class="btn-primary px-4 py-2 text-sm shrink-0"
          (click)="goGenerate()">
          Generate
        </button>
      </div>

    </div>
  `,
})
export class TestListComponent {
  private readonly router = inject(Router);

  readonly selectedExam = signal<string>('ALL');

  readonly EXAMS = [
    { id: 'ALL',  icon: '📚', colour: '#FF6B35' },
    { id: 'NEET', icon: '🩺', colour: '#06D6A0' },
    { id: 'JEE',  icon: '⚛️', colour: '#4CC9F0' },
    { id: 'UPSC', icon: '🏛️', colour: '#FFD166' },
    { id: 'CAT',  icon: '📊', colour: '#7B2FBE' },
    { id: 'SSC',  icon: '📋', colour: '#F4A261' },
  ];

  readonly STATS = [
    { icon: '📝', value: '24', label: 'Tests taken' },
    { icon: '🎯', value: '71%', label: 'Avg accuracy' },
    { icon: '🔥', value: '12', label: 'Day streak' },
    { icon: '⏱️', value: '18h', label: 'Time practised' },
  ];

  readonly TESTS: TestCard[] = [
    { id: '1', exam: 'NEET', subject: 'Biology', topic: 'Cell Biology & Organelles', questions: 30, duration: 30, difficulty: 'medium', attempts: 3, bestScore: 73, icon: '🔬', colour: '#06D6A0' },
    { id: '2', exam: 'NEET', subject: 'Physics', topic: 'Laws of Motion', questions: 25, duration: 25, difficulty: 'hard', attempts: 1, bestScore: 52, icon: '⚡', colour: '#4CC9F0' },
    { id: '3', exam: 'NEET', subject: 'Chemistry', topic: 'Chemical Bonding', questions: 20, duration: 20, difficulty: 'easy', attempts: 0, bestScore: null, icon: '🧪', colour: '#7B2FBE' },
    { id: '4', exam: 'JEE',  subject: 'Mathematics', topic: 'Integral Calculus', questions: 20, duration: 30, difficulty: 'hard', attempts: 2, bestScore: 60, icon: '📐', colour: '#FF6B35' },
    { id: '5', exam: 'JEE',  subject: 'Physics', topic: 'Modern Physics', questions: 15, duration: 20, difficulty: 'medium', attempts: 0, bestScore: null, icon: '⚛️', colour: '#4CC9F0' },
    { id: '6', exam: 'UPSC', subject: 'History', topic: 'Ancient India', questions: 25, duration: 25, difficulty: 'medium', attempts: 1, bestScore: 84, icon: '🏛️', colour: '#FFD166' },
    { id: '7', exam: 'UPSC', subject: 'Polity', topic: 'Constitutional Framework', questions: 20, duration: 20, difficulty: 'hard', attempts: 0, bestScore: null, icon: '⚖️', colour: '#F4A261' },
    { id: '8', exam: 'CAT',  subject: 'Quantitative Aptitude', topic: 'Number Systems', questions: 20, duration: 25, difficulty: 'medium', attempts: 0, bestScore: null, icon: '🔢', colour: '#7B2FBE' },
    { id: '9', exam: 'SSC',  subject: 'General Knowledge', topic: 'Indian Geography', questions: 25, duration: 20, difficulty: 'easy', attempts: 4, bestScore: 88, icon: '🗺️', colour: '#06D6A0' },
  ];

  readonly filteredTests = computed(() => {
    const exam = this.selectedExam();
    if (exam === 'ALL') return this.TESTS;
    return this.TESTS.filter((t) => t.exam === exam);
  });

  diffColour(d: string): string {
    if (d === 'easy') return '#06D6A0';
    if (d === 'hard') return '#E94560';
    return '#FFD166';
  }

  goGenerate(): void {
    this.router.navigate(['/test-engine', 'generate']);
  }

  startTest(test: TestCard): void {
    this.router.navigate(['/test-engine', 'generate'], {
      state: { prefill: { exam: test.exam, subject: test.subject, topic: test.topic, difficulty: test.difficulty } },
    });
  }
}

