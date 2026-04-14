import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  labelHi: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);

  readonly collapsed = signal(false);
  readonly isHindi = signal(localStorage.getItem('lang_preference') === 'hi');

  readonly user = computed(() => this.authService.currentUser());

  readonly streak = computed(() => this.user()?.streak?.current ?? 0);

  readonly subscriptionLabel = computed(() => {
    const plan = this.user()?.subscription?.plan ?? 'free';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  });

  readonly isPro = computed(() => {
    const plan = this.user()?.subscription?.plan ?? 'free';
    return plan !== 'free';
  });

  readonly daysLeft = computed(() => {
    const u = this.user();
    if (!u?.examDate) return null;
    return Math.max(0, Math.ceil((new Date(u.examDate).getTime() - Date.now()) / 86400000));
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',    labelHi: 'डैशबोर्ड',   path: '/dashboard',    icon: '🏠' },
    { label: 'Test Engine',  labelHi: 'परीक्षा',      path: '/test-engine',  icon: '📝' },
    { label: 'Results',      labelHi: 'परिणाम',       path: '/results',      icon: '📊' },
    { label: 'Roadmap',      labelHi: 'रोडमैप',       path: '/roadmap',      icon: '🗺️' },
    { label: 'Weak Areas',   labelHi: 'कमज़ोर क्षेत्र', path: '/weak-areas',   icon: '🎯' },
    { label: 'Study Groups', labelHi: 'स्टडी ग्रुप',  path: '/study-groups', icon: '👥' },
    { label: 'Institute',    labelHi: 'संस्थान',      path: '/institute',    icon: '🏛️' },
    { label: 'Parent',       labelHi: 'अभिभावक',      path: '/parent',       icon: '👨‍👧' },
    { label: 'Pricing',      labelHi: 'योजनाएं',      path: '/pricing',      icon: '💎' },
  ];

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  toggleLanguage(): void {
    this.isHindi.update((v) => !v);
    localStorage.setItem('lang_preference', this.isHindi() ? 'hi' : 'en');
  }

  logout(): void {
    this.authService.logout();
  }
}
