import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ApiService } from './api.service';
import type { ApiResponse } from './api.service';
import {
  Plan,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  SubscriptionStatusResponse,
  CancelSubscriptionResponse,
  RazorpayOptions,
  RazorpayHandlerResponse,
} from '../models/payment.model';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);

  // ── Plans ────────────────────────────────────────────────────────────────

  getPlans(): Observable<ApiResponse<Plan[]>> {
    return this.api.get<Plan[]>('/payments/plans');
  }

  // ── Order ────────────────────────────────────────────────────────────────

  createOrder(payload: CreateOrderRequest): Observable<ApiResponse<CreateOrderResponse>> {
    return this.api.post<CreateOrderResponse>('/payments/create-order', payload);
  }

  // ── Verify ───────────────────────────────────────────────────────────────

  verifyPayment(payload: VerifyPaymentRequest): Observable<ApiResponse<VerifyPaymentResponse>> {
    return this.api.post<VerifyPaymentResponse>('/payments/verify', payload);
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  getSubscriptionStatus(): Observable<ApiResponse<SubscriptionStatusResponse>> {
    return this.api.get<SubscriptionStatusResponse>('/payments/subscription');
  }

  cancelSubscription(): Observable<ApiResponse<CancelSubscriptionResponse>> {
    return this.api.post<CancelSubscriptionResponse>('/payments/cancel', {});
  }

  // ── Razorpay Checkout ────────────────────────────────────────────────────

  /**
   * Dynamically loads the Razorpay checkout script if not already loaded.
   */
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const script    = document.createElement('script');
      script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload   = () => resolve();
      script.onerror  = () => reject(new Error('Failed to load Razorpay checkout script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Opens the Razorpay native checkout modal and returns a promise that
   * resolves with the handler response on success, or rejects if dismissed.
   */
  openCheckout(options: RazorpayOptions): Promise<RazorpayHandlerResponse> {
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        ...options,
        handler: (response) => resolve(response),
        modal:   { ondismiss: () => reject(new Error('Payment cancelled by user')) },
      });
      rzp.open();
    });
  }
}
