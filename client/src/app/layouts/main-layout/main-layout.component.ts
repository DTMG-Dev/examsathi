import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppNavbarComponent } from '../../shared/components/app-navbar/app-navbar.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AppNavbarComponent,
    AppSidebarComponent,
    ToastNotificationComponent,
    ConfirmModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly mobileMenuOpen = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
