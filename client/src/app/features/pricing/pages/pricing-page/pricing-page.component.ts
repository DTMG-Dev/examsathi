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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentService } from '../../../../core/services/payment.service';
import { AuthService }    from '../../../../core/services/auth.service';
import { ToastService }   from '../../../../core/services/toast.service';
import { Plan, BillingCycle } from '../../../../core/models/payment.model';

interface FAQ {
  question: string;
  answer:   string;
  open:     boolean;
}

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pricing-page.component.html',
  styleUrl:    './pricing-page.component.scss',
})
export class PricingPageComponent implements OnInit {
  private readonly paymentService = inject(PaymentService);
  private readonly authService    = inject(AuthService);
  private readonly toastService   = inject(ToastService);
  private readonly router         = inject(Router);
  private readonly destroyRef     = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly plans        = signal<Plan[]>([]);
  readonly isLoading    = signal(true);
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly loadingPlan  = signal<string | null>(null);
  readonly faqs         = signal<FAQ[]>([
    { question: 'Can I switch plans anytime?',
      answer:   'Yes! You can upgrade or downgrade your plan at any time. Upgrades are effective immediately. Downgrades take effect at the end of your current billing cycle.',
      open: false },
    { question: 'Is there a free trial?',
      answer:   'Our Free plan is available forever with no credit card required. You can explore ExamSathi\'s core features and upgrade whenever you\'re ready.',
      open: false },
    { question: 'What payment methods are accepted?',
      answer:   'We accept all major credit/debit cards, UPI (Google Pay, PhonePe, Paytm), net banking, and EMI options via Razorpay — India\'s most trusted payment gateway.',
      open: false },
    { question: 'Is my payment data secure?',
      answer:   'Absolutely. All payments are processed by Razorpay which is PCI-DSS compliant. We never store your card details on our servers.',
      open: false },
    { question: 'Can I get a refund?',
      answer:   'We offer a 7-day money-back guarantee for all paid plans. If you\'re not satisfied, contact support within 7 days of purchase for a full refund.',
      open: false },
    { question: 'Do institute plans include student accounts?',
      answer:   'Yes! Institute plans include full student accounts. Students get access to all features included in the institute plan. You manage batches and assign tests from the admin portal.',
      open: false },
  ]);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly user = computed(() => this.authService.currentUser());

  readonly individualPlans = computed(() =>
    this.plans().filter((p) => p.type === 'individual' || p.type === 'family'),
  );

  readonly institutePlans = computed(() =>
    this.plans().filter((p) => p.type === 'institute'),
  );

  readonly currentPlanSlug = computed(() => {
    const planKey = this.user()?.subscription?.plan ?? 'free';
    // Map userPlanKey back to a slug for "current plan" highlighting
    const planKeyToSlug: Record<string, string> = {
      free: 'free', basic: 'student', pro: 'pro', institute: 'institute_starter',
    };
    return planKeyToSlug[planKey] ?? 'free';
  });

  readonly isAnnual = computed(() => this.billingCycle() === 'annual');

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.paymentService
      .getPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.plans.set(res.data);
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  getPrice(plan: Plan): number {
    return this.isAnnual() ? plan.priceAnnual : plan.priceMonthly;
  }

  getSavingsPercent(): number { return 30; }

  isCurrentPlan(plan: Plan): boolean {
    return this.currentPlanSlug() === plan.slug;
  }

  async selectPlan(plan: Plan): Promise<void> {
    // Free plan — just navigate to dashboard
    if (plan.priceMonthly === 0) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Not logged in — redirect to register
    if (!this.user()) {
      this.router.navigate(['/auth/register'], {
        queryParams: { plan: plan.slug, cycle: this.billingCycle() },
      });
      return;
    }

    // Already on this plan
    if (this.isCurrentPlan(plan)) {
      this.toastService.info('You are already on this plan.');
      return;
    }

    this.loadingPlan.set(plan.slug);

    try {
      // 1. Load Razorpay script
      await this.paymentService.loadRazorpayScript();

      // 2. Create order on server
      const orderRes = await new Promise<import('../../../../core/models/payment.model').CreateOrderResponse>(
        (resolve, reject) => {
          this.paymentService
            .createOrder({ planSlug: plan.slug, billingCycle: this.billingCycle() })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (r) => r.success ? resolve(r.data) : reject(r), error: reject });
        },
      );

      const u = this.user()!;

      // 3. Open Razorpay checkout
      const handlerResponse = await this.paymentService.openCheckout({
        key:         orderRes.keyId,
        amount:      orderRes.amount,
        currency:    orderRes.currency,
        name:        'ExamSathi',
        description: `${plan.name} — ${this.billingCycle()} subscription`,
        order_id:    orderRes.orderId,
        prefill: {
          name:    u.name,
          email:   u.email,
          contact: u.phone ?? '',
        },
        theme: { color: '#ff6b35' },
      });

      // 4. Verify on server
      this.paymentService
        .verifyPayment({
          razorpay_order_id:   handlerResponse.razorpay_order_id,
          razorpay_payment_id: handlerResponse.razorpay_payment_id,
          razorpay_signature:  handlerResponse.razorpay_signature,
          planSlug:            plan.slug,
          billingCycle:        this.billingCycle(),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.loadingPlan.set(null);
            if (res.success) {
              // Refresh user to reflect new plan
              this.authService.refreshCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
              this.router.navigate(['/pricing/success'], {
                state: { planName: plan.name, data: res.data },
              });
            }
          },
          error: () => {
            this.loadingPlan.set(null);
            this.toastService.error('Payment verification failed. Please contact support.');
          },
        });

    } catch (err: unknown) {
      this.loadingPlan.set(null);
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg !== 'Payment cancelled by user') {
        this.toastService.error(msg);
      }
    }
  }

  toggleFaq(index: number): void {
    this.faqs.update((list) => {
      const updated = [...list];
      updated[index] = { ...updated[index], open: !updated[index].open };
      return updated;
    });
  }

  setBilling(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  scrollToPlans(): void {
    document.querySelector('.pp__cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  trackBySlug(_: number, plan: Plan): string { return plan.slug; }
}
