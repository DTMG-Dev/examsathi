import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { RoadmapTopic } from '../../../core/models/roadmap.model';

export interface TodayPlanTopic extends RoadmapTopic {
  weekId: string;
}

@Component({
  selector: 'app-today-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base">📅</span>
          <p class="font-semibold text-white text-sm">Today's Plan</p>
          @if (topics().length > 0) {
            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: rgba(255,107,53,0.15); color: #ff6b35;">
              {{ doneCount() }}/{{ topics().length }}
            </span>
          }
        </div>
        @if (topics().length > 0) {
          <p class="text-xs text-white/30">
            {{ totalHours() }}h total
          </p>
        }
      </div>

      <!-- Progress bar -->
      @if (topics().length > 0) {
        <div class="h-1 w-full rounded-full" style="background: rgba(255,255,255,0.08);">
          <div class="h-full rounded-full transition-all duration-500"
            [style.width]="progressPct() + '%'"
            style="background: linear-gradient(90deg, #ff6b35, #e94560);">
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (topics().length === 0) {
        <div class="flex flex-col items-center gap-2 py-6 text-center">
          @if (isLoading()) {
            <div class="skeleton h-4 w-48 rounded"></div>
            <div class="skeleton h-4 w-32 rounded"></div>
          } @else if (hasRoadmap()) {
            <span class="text-2xl">🎉</span>
            <p class="text-sm text-white/50">No topics scheduled for today</p>
            <p class="text-xs text-white/30">Enjoy the break or get ahead on tomorrow's topics</p>
          } @else {
            <span class="text-2xl">🗺️</span>
            <p class="text-sm text-white/50">No roadmap yet</p>
            <button type="button" class="text-primary text-sm font-medium mt-1"
              (click)="generateClicked.emit()">
              Generate your AI plan →
            </button>
          }
        </div>
      }

      <!-- Topic list -->
      @if (!isLoading() && topics().length > 0) {
        <div class="flex flex-col gap-2">
          @for (topic of topics(); track topic._id) {
            <div class="flex items-start gap-3 p-3 rounded-xl transition-all duration-200"
              [style.background]="checkedIds().has(topic._id) ? 'rgba(6,214,160,0.06)' : 'rgba(255,255,255,0.03)'"
              [style.border]="'1px solid ' + (checkedIds().has(topic._id) ? 'rgba(6,214,160,0.15)' : 'rgba(255,255,255,0.05)')">

              <!-- Checkbox -->
              <button type="button"
                class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200"
                [style.border-color]="checkedIds().has(topic._id) ? '#06D6A0' : 'rgba(255,255,255,0.2)'"
                [style.background]="checkedIds().has(topic._id) ? 'rgba(6,214,160,0.2)' : 'transparent'"
                (click)="toggleCheck(topic)">
                @if (checkedIds().has(topic._id)) {
                  <span class="text-xs" style="color: #06D6A0;">✓</span>
                }
              </button>

              <div class="flex flex-col gap-1 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="w-2 h-2 rounded-full shrink-0"
                    [style.background]="subjectColour(topic.subject)"></div>
                  <span class="text-sm font-medium text-white"
                    [class.line-through]="checkedIds().has(topic._id)"
                    [class.opacity-50]="checkedIds().has(topic._id)">
                    {{ topic.topic }}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-white/40">
                  <span class="font-medium" [style.color]="subjectColour(topic.subject)">
                    {{ topic.subject }}
                  </span>
                  <span>{{ topic.estimatedHours }}h</span>
                </div>
                @if (topic.resources.length > 0) {
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    @for (res of topic.resources.slice(0, 2); track res) {
                      <span class="text-xs px-1.5 py-0.5 rounded"
                        style="background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);">
                        {{ res }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- All done celebration -->
        @if (doneCount() === topics().length && topics().length > 0) {
          <div class="flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold"
            style="background: rgba(6,214,160,0.1); color: #06D6A0; border: 1px solid rgba(6,214,160,0.2);">
            <span>🎉</span>
            All done for today! Great work.
          </div>
        }
      }
    </div>
  `,
})
export class TodayPlanComponent {
  readonly topics = input<TodayPlanTopic[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly hasRoadmap = input<boolean>(false);
  /** IDs of already-completed topics (from parent, so parent owns state) */
  readonly completedIds = input<Set<string>>(new Set());

  /** Emitted when user toggles a topic checkbox */
  readonly topicToggled = output<{ topic: TodayPlanTopic; isCompleted: boolean }>();
  /** Emitted when "Generate your AI plan" is clicked */
  readonly generateClicked = output<void>();

  /** Local optimistic state — merges parent completedIds + user clicks this session */
  readonly checkedIds = signal<Set<string>>(new Set());

  readonly doneCount = computed(() => this.checkedIds().size);

  readonly totalHours = computed(() =>
    this.topics().reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
  );

  readonly progressPct = computed(() => {
    const total = this.topics().length;
    if (total === 0) return 0;
    return Math.round((this.doneCount() / total) * 100);
  });

  constructor() {
    // When parent passes completedIds, sync into local state once
    // (Angular signals don't have an effect that runs on input change without effect(),
    //  so we handle this by treating completedIds as initial seed in ngOnInit-equivalent)
  }

  ngOnInit(): void {
    // Seed local checked state from parent
    this.checkedIds.set(new Set(this.completedIds()));
  }

  toggleCheck(topic: TodayPlanTopic): void {
    const id = topic._id;
    const isNowCompleted = !this.checkedIds().has(id);

    this.checkedIds.update((set) => {
      const next = new Set(set);
      if (isNowCompleted) next.add(id);
      else next.delete(id);
      return next;
    });

    this.topicToggled.emit({ topic, isCompleted: isNowCompleted });
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
    return COLOURS[subject] ?? '#FF6B35';
  }
}
