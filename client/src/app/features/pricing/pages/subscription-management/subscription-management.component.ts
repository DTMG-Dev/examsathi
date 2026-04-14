import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentService } from '../../../../core/services/payment.service';
import { AuthService }    from '../../../../core/services/auth.service';
import { ToastService }   from '../../../../core/services/toast.service';
import { ConfirmModalService } from '../../../../core/services/confirm-modal.service';
import { SubscriptionStatusResponse } from '../../../../core/models/payment.model';

@Component({
  selector: 'app-subscription-management',
  standalone: true,
  imports: [RouterLink, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-management.component.html',
  styleUrl:    './subscription-management.component.scss',
})
export class SubscriptionManagementComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly authService    = inject(AuthService);
  private readonly toastService   = inject(ToastService);
  private readonly confirmService = inject(ConfirmModalService);
  private readonly router         = inject(Router);
  private readonly destroyRef     = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly subStatus     = signal<SubscriptionStatusResponse | null>(null);
  readonly isLoading     = signal(true);
  readonly isCancelling  = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly user = computed(() => this.authService.currentUser());

  readonly currentPlan = computed(() =>
    this.subStatus()?.plan ?? null,
  );

  readonly subscription = computed(() =>
    this.subStatus()?.subscription ?? null,
  );

  readonly daysRemaining = computed(() =>
    this.subStatus()?.daysRemaining ?? null,
  );

  readonly isFreePlan = computed(() =>
    (this.subscription()?.plan ?? 'free') === 'free',
  );

  readonly isPaidActive = computed(() =>
    !this.isFreePlan() && (this.subscription()?.isActive ?? false),
  );

  readonly planBadgeClass = computed(() => {
    const plan = this.subscription()?.plan ?? 'free';
    return `sm__plan-badge--${plan}`;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.paymentService
      .getSubscriptionStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.subStatus.set(res.data);
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  upgradePlan(): void {
    this.router.navigate(['/pricing']);
  }

  async cancelSubscription(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title:        'Cancel Subscription?',
      message:      'Your access will continue until the end of your current billing period. Are you sure you want to cancel?',
      confirmLabel: 'Yes, Cancel',
      cancelLabel:  'Keep Plan',
      danger:       true,
    });

    if (!confirmed) return;

    this.isCancelling.set(true);

    this.paymentService
      .cancelSubscription()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isCancelling.set(false);
          if (res.success) {
            this.toastService.success('Subscription cancelled. You retain access until billing period ends.');
            // Refresh status
            this.subStatus.update((s) => s ? {
              ...s,
              subscription: { ...s.subscription, isActive: false },
            } : s);
            // Refresh auth user
            this.authService.refreshCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          }
        },
        error: () => {
          this.isCancelling.set(false);
          this.toastService.error('Failed to cancel subscription. Please try again or contact support.');
        },
      });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  getPlanDisplayName(planKey: string | undefined): string {
    const names: Record<string, string> = {
      free:      'Free',
      basic:     'Student',
      pro:       'Pro',
      institute: 'Institute',
    };
    return names[planKey ?? 'free'] ?? 'Free';
  }

  getPlanColor(planKey: string | undefined): string {
    const colors: Record<string, string> = {
      free:      '#6b7280',
      basic:     '#3b82f6',
      pro:       '#ff6b35',
      institute: '#a855f7',
    };
    return colors[planKey ?? 'free'] ?? '#6b7280';
  }
}
