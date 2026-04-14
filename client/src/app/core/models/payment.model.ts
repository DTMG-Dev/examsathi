// ─── Plan ──────────────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'annual';
export type PlanType     = 'individual' | 'family' | 'institute';
export type UserPlanKey  = 'free' | 'basic' | 'pro' | 'institute';

export interface PlanLimits {
  questionsPerDay: number | null;
  subjects:        number | null;
  studentsMax:     number | null;
  testsPerMonth:   number | null;
  aiDoubts:        boolean;
  hindiSupport:    boolean;
  analytics:       boolean;
  parentDashboard: boolean;
  downloadPDF:     boolean;
}

export interface Plan {
  _id:                  string;
  slug:                 string;
  name:                 string;
  tagline:              string;
  userPlanKey:          UserPlanKey;
  type:                 PlanType;
  priceMonthly:         number;
  priceAnnual:          number;
  razorpayPlanIdMonthly: string | null;
  razorpayPlanIdAnnual:  string | null;
  features:             string[];
  limits:               PlanLimits;
  isPopular:            boolean;
  isActive:             boolean;
  sortOrder:            number;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  planSlug:     string;
  billingCycle: BillingCycle;
}

export interface CreateOrderResponse {
  orderId:      string;
  amount:       number;     // paise
  amountINR:    number;     // ₹
  currency:     string;
  planSlug:     string;
  planName:     string;
  billingCycle: BillingCycle;
  keyId:        string;     // Razorpay public key for checkout
}

// ─── Razorpay Checkout ────────────────────────────────────────────────────────

/** Razorpay checkout handler response (from their JS SDK) */
export interface RazorpayHandlerResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export interface VerifyPaymentRequest {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
  planSlug:            string;
  billingCycle:        BillingCycle;
}

export interface VerifyPaymentResponse {
  subscription:  UserSubscription;
  planName:      string;
  planSlug:      string;
  billingCycle:  BillingCycle;
  endDate:       string;
  amountPaid:    number;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface UserSubscription {
  plan:                   UserPlanKey;
  isActive:               boolean;
  startDate:              string | null;
  endDate:                string | null;
  razorpaySubscriptionId: string | null;
  razorpayOrderId:        string | null;
}

export interface SubscriptionStatusResponse {
  subscription:   UserSubscription;
  plan:           Plan | null;
  isExpired:      boolean;
  daysRemaining:  number | null;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export interface CancelSubscriptionResponse {
  cancelledAt: string;
  accessUntil: string | null;
  message:     string;
}

// ─── Razorpay global type (loaded via CDN script) ─────────────────────────────

export interface RazorpayOptions {
  key:          string;
  amount:       number;
  currency:     string;
  name:         string;
  description:  string;
  order_id:     string;
  prefill?:     { name?: string; email?: string; contact?: string };
  theme?:       { color?: string };
  /** Injected by PaymentService.openCheckout — optional when calling openCheckout */
  handler?:     (response: RazorpayHandlerResponse) => void;
  modal?:       { ondismiss?: () => void };
}
