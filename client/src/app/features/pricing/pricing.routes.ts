import { Routes } from '@angular/router';

export const PRICING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pricing-page/pricing-page.component').then(
        (m) => m.PricingPageComponent,
      ),
    title: 'Pricing — ExamSathi',
  },
  {
    path: 'success',
    loadComponent: () =>
      import('./pages/payment-success/payment-success.component').then(
        (m) => m.PaymentSuccessComponent,
      ),
    title: 'Payment Successful — ExamSathi',
  },
  {
    path: 'subscription',
    loadComponent: () =>
      import('./pages/subscription-management/subscription-management.component').then(
        (m) => m.SubscriptionManagementComponent,
      ),
    title: 'Subscription — ExamSathi',
  },
];
