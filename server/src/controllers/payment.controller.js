import { User } from '../models/index.js';
import Plan from '../models/Plan.model.js';
import { logger } from '../utils/logger.js';
import * as razorpayService from '../services/razorpay.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(res, data, message = 'OK') {
  return res.json({ success: true, data, message });
}

function badRequest(res, msg) {
  return res.status(400).json({ success: false, error: msg, code: 400 });
}

function notFound(res, msg = 'Not found') {
  return res.status(404).json({ success: false, error: msg, code: 404 });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/payments/plans
 * Returns all active subscription plans (no auth required).
 */
export async function getPlans(req, res, next) {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

    if (plans.length === 0) {
      // Seed plans on first call if DB is empty (development convenience)
      const { PLAN_SEEDS } = await import('../models/Plan.model.js');
      await Plan.insertMany(PLAN_SEEDS, { ordered: false }).catch(() => {});
      const seeded = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
      return ok(res, seeded, 'Plans retrieved');
    }

    return ok(res, plans, 'Plans retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for the selected plan and billing cycle.
 * Body: { planSlug, billingCycle: 'monthly' | 'annual' }
 */
export async function createOrder(req, res, next) {
  try {
    const userId = req.user.userId;
    const { planSlug, billingCycle = 'monthly' } = req.body;

    if (!planSlug) return badRequest(res, 'planSlug is required');

    const plan = await Plan.findOne({ slug: planSlug, isActive: true }).lean();
    if (!plan) return notFound(res, `Plan "${planSlug}" not found`);

    // Free plan doesn't need a payment order
    if (plan.priceMonthly === 0) {
      return badRequest(res, 'Free plan does not require payment');
    }

    const amount  = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
    const receipt = `${userId.toString().slice(-8)}_${planSlug}_${Date.now()}`;

    const order = await razorpayService.createOrder(amount, receipt, {
      userId:      userId.toString(),
      planSlug,
      billingCycle,
      planName:    plan.name,
    });

    return ok(res, {
      orderId:    order.id,
      amount:     order.amount,        // in paise
      amountINR:  amount,              // in ₹
      currency:   order.currency,
      planSlug,
      planName:   plan.name,
      billingCycle,
      keyId:      req.app.locals.razorpayKeyId, // public key for frontend checkout
    }, 'Order created');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/verify
 * Verifies Razorpay signature and activates the user's subscription.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planSlug, billingCycle }
 */
export async function verifyPayment(req, res, next) {
  try {
    const userId = req.user.userId;
    const {
      razorpay_order_id:   orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature:  signature,
      planSlug,
      billingCycle = 'monthly',
    } = req.body;

    // Validate required fields
    if (!orderId || !paymentId || !signature || !planSlug) {
      return badRequest(res, 'orderId, paymentId, signature and planSlug are required');
    }

    // Verify HMAC signature — the only thing that proves payment actually succeeded
    const isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      logger.warn(`Payment signature verification failed for user ${userId}, order ${orderId}`);
      return res.status(400).json({
        success: false,
        error:   'Payment verification failed — invalid signature',
        code:    400,
      });
    }

    // Fetch plan details
    const plan = await Plan.findOne({ slug: planSlug, isActive: true }).lean();
    if (!plan) return notFound(res, `Plan "${planSlug}" not found`);

    // Calculate subscription end date
    const now     = new Date();
    const endDate = new Date(now);
    if (billingCycle === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Activate user subscription
    const user = await User.findByIdAndUpdate(
      userId,
      {
        'subscription.plan':         plan.userPlanKey,
        'subscription.isActive':     true,
        'subscription.startDate':    now,
        'subscription.endDate':      endDate,
        'subscription.razorpayOrderId': orderId,
      },
      { new: true },
    ).select('-password -refreshToken');

    logger.info(`Subscription activated: user=${userId} plan=${planSlug} cycle=${billingCycle}`);

    return ok(res, {
      subscription: user.subscription,
      planName:     plan.name,
      planSlug,
      billingCycle,
      endDate:      endDate.toISOString(),
      amountPaid:   billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly,
    }, 'Payment verified and subscription activated!');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/subscription
 * Returns the current user's subscription plan details + usage stats.
 */
export async function getSubscriptionStatus(req, res, next) {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .select('subscription name email')
      .lean();

    if (!user) return notFound(res, 'User not found');

    // Find the matching plan document for rich feature data
    const planKey  = user.subscription?.plan ?? 'free';
    const planDoc  = await Plan.findOne({ userPlanKey: planKey, isActive: true })
      .sort({ priceMonthly: -1 }) // If multiple plans map to same key (family/student → basic), get the more expensive
      .lean();

    // Check if subscription is still valid
    const isExpired = user.subscription?.endDate
      ? new Date(user.subscription.endDate) < new Date()
      : false;

    if (isExpired && planKey !== 'free') {
      // Auto-downgrade expired subscriptions
      await User.findByIdAndUpdate(userId, {
        'subscription.plan':     'free',
        'subscription.isActive': false,
      });
      user.subscription.plan     = 'free';
      user.subscription.isActive = false;
    }

    return ok(res, {
      subscription: user.subscription,
      plan:         planDoc ?? null,
      isExpired,
      daysRemaining: user.subscription?.endDate
        ? Math.max(0, Math.ceil((new Date(user.subscription.endDate) - new Date()) / 86400000))
        : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/cancel
 * Cancels the user's subscription at end of billing cycle.
 */
export async function cancelSubscription(req, res, next) {
  try {
    const userId = req.user.userId;
    const user   = await User.findById(userId).select('subscription').lean();

    if (!user) return notFound(res, 'User not found');

    const sub = user.subscription;
    if (!sub?.isActive || sub?.plan === 'free') {
      return badRequest(res, 'No active paid subscription to cancel');
    }

    // If they have a Razorpay subscription ID, cancel it remotely
    if (sub.razorpaySubscriptionId) {
      try {
        await razorpayService.cancelSubscription(sub.razorpaySubscriptionId, true);
      } catch (err) {
        logger.warn(`Razorpay cancel failed (may already be cancelled): ${err.message}`);
      }
    }

    // Mark as cancelled — access remains until endDate
    await User.findByIdAndUpdate(userId, {
      'subscription.isActive': false,
    });

    logger.info(`Subscription cancelled for user ${userId}`);

    return ok(res, {
      cancelledAt: new Date().toISOString(),
      accessUntil: sub.endDate ?? null,
      message:     'Subscription cancelled. Access continues until the end of your billing period.',
    }, 'Subscription cancelled');
  } catch (err) {
    next(err);
  }
}
