import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  OnInit,
} from '@angular/core';

@Component({
  selector: 'app-score-circle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-circle.component.html',
  styleUrl: './score-circle.component.scss',
})
export class ScoreCircleComponent implements OnInit {
  readonly score = input.required<number>(); // 0–100
  readonly size = input<number>(88);
  readonly strokeWidth = input<number>(8);
  readonly label = input<string>('');
  readonly animate = input<boolean>(true);

  readonly animated = signal(false);

  readonly radius = computed(() => (this.size() - this.strokeWidth() * 2) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());

  readonly dashOffset = computed(() => {
    if (!this.animated()) return this.circumference();
    return this.circumference() * (1 - this.score() / 100);
  });

  readonly colour = computed(() => {
    const s = this.score();
    if (s >= 80) return '#06D6A0';
    if (s >= 60) return '#FFD166';
    if (s >= 40) return '#FF6B35';
    return '#E94560';
  });

  ngOnInit(): void {
    if (this.animate()) {
      setTimeout(() => this.animated.set(true), 300);
    } else {
      this.animated.set(true);
    }
  }
}
