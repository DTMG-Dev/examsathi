import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

const SUBJECT_COLOURS: Record<string, string> = {
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

@Component({
  selector: 'app-subject-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subject-badge.component.html',
  styleUrl: './subject-badge.component.scss',
})
export class SubjectBadgeComponent {
  readonly subject = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');
  readonly showDot = input<boolean>(true);

  readonly colour = computed(
    () => SUBJECT_COLOURS[this.subject()] ?? '#FF6B35',
  );
}
