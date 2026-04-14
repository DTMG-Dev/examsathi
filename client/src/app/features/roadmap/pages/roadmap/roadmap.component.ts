import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { RoadmapService } from '../../../../core/services/roadmap.service';

/**
 * Roadmap shell — checks if a roadmap exists and redirects:
 *   roadmap exists  →  /roadmap/view
 *   no roadmap      →  /roadmap/generate
 */
@Component({
  selector: 'app-roadmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6">
      <div class="skeleton h-10 w-48 rounded-xl"></div>
      <div class="skeleton h-32 rounded-2xl"></div>
      @for (i of [1, 2, 3, 4]; track i) {
        <div class="skeleton h-16 w-full rounded-xl"></div>
      }
    </div>
  `,
})
export class RoadmapComponent implements OnInit {
  private readonly roadmapService = inject(RoadmapService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.roadmapService.getCurrent().subscribe({
      next: (res) => {
        if (res.data) {
          this.router.navigate(['/roadmap', 'view'], { replaceUrl: true });
        } else {
          this.router.navigate(['/roadmap', 'generate'], { replaceUrl: true });
        }
      },
      error: () => {
        // On error, send to generator as safe fallback
        this.router.navigate(['/roadmap', 'generate'], { replaceUrl: true });
      },
    });
  }
}
