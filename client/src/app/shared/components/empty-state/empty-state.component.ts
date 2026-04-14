import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input<string>('📭');
  readonly title = input<string>('Nothing here yet');
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionClicked = output<void>();
}
