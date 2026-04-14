import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Redirect stub — the real test session lives at /test-engine/session (test-screen.component).
 * This path exists for backwards compatibility; just redirect.
 */
@Component({
  selector: 'app-test-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center min-h-96 gap-4 p-6 text-center">
      <span class="text-4xl">📝</span>
      <p class="font-semibold text-white">No active test session</p>
      <p class="text-white/40 text-sm">Generate a test first to start practising</p>
      <button type="button" class="btn-primary px-6"
        (click)="router.navigate(['/test-engine','generate'])">
        ✨ Generate Test
      </button>
    </div>
  `,
})
export class TestSessionComponent {
  readonly router = inject(Router);
}
