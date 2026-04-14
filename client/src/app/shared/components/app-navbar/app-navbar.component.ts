import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  output,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-navbar.component.html',
  styleUrl: './app-navbar.component.scss',
})
export class AppNavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = input<boolean>(false);
  readonly menuToggled = output<void>();

  readonly user = computed(() => this.authService.currentUser());
  readonly profileOpen = signal(false);

  readonly daysLeft = computed(() => {
    const u = this.user();
    if (!u?.examDate) return null;
    const days = Math.max(0, Math.ceil((new Date(u.examDate).getTime() - Date.now()) / 86400000));
    return days;
  });

  readonly hasAvatar   = computed(() => !!this.user()?.profilePic);

  readonly planKey     = computed(() => this.user()?.subscription?.plan ?? 'free');
  readonly isFreePlan  = computed(() => this.planKey() === 'free');
  readonly planLabel   = computed(() => {
    const map: Record<string, string> = { free: 'Free', basic: 'Student', pro: 'Pro', institute: 'Institute' };
    return map[this.planKey()] ?? 'Free';
  });

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  });

  toggleProfile(): void {
    this.profileOpen.update((v) => !v);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  goToProfile(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/profile']);
  }

  goToPricing(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/pricing']);
  }

  goToSubscription(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/pricing/subscription']);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.authService.logout();
  }
}
