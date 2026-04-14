import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { Institute } from '../../../../core/models/institute.model';

@Component({
  selector: 'app-institute-portal',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institute-portal.component.html',
  styleUrl: './institute-portal.component.scss',
})
export class InstitutePortalComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly router           = inject(Router);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute    = signal<Institute | null>(null);
  readonly isLoading    = signal(true);
  readonly sidebarOpen  = signal(false);

  readonly brandColor   = computed(() => this.institute()?.brandColor ?? '#ff6b35');
  readonly instituteName = computed(() => this.institute()?.name ?? 'Institute Portal');
  readonly logo         = computed(() => this.institute()?.logo ?? null);

  readonly navItems = [
    { path: 'dashboard',  label: 'Dashboard',    icon: '📊' },
    { path: 'batches',    label: 'Batches',       icon: '👥' },
    { path: 'assign-test', label: 'Assign Tests', icon: '📝' },
    { path: 'results',    label: 'Results',       icon: '📈' },
    { path: 'settings',   label: 'Settings',      icon: '⚙️' },
  ];

  ngOnInit(): void {
    this.instituteService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.institute.set(res.data.institute);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          // No institute yet — dashboard will show the creation form
        },
      });
  }

  toggleSidebar(): void { this.sidebarOpen.update((v) => !v); }
  closeSidebar(): void  { this.sidebarOpen.set(false); }

  trackByPath(_: number, item: { path: string }): string { return item.path; }
}
