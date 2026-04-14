import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ─── Lazily initialised Razorpay instance ─────────────────────────────────────
let _razorpay = null;

function getRazorpay() {
  if (!_razorpay) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    }
    _razorpay = new Razorpay({
      key_id:     config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return _razorpay;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order for one-time payment checkout.
 *
 * @param {number} amountINR  - Amount in Indian Rupees (converted to paise internally)
 * @param {string} receipt    - Unique receipt identifier (e.g. userId + planSlug + timestamp)
 * @param {Object} notes      - Key-value metadata stored on the Razorpay order
 * @returns {Promise<{id, amount, currency, receipt}>}
 */
export async function createOrder(amountINR, receipt, notes = {}) {
  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   Math.round(amountINR * 100), // paise
      currency: 'INR',
      receipt:  receipt.slice(0, 40),        // Razorpay limit: 40 chars
      notes,
    });
    logger.info(`Razorpay order created: ${order.id} for ₹${amountINR}`);
    return order;
  } catch (err) {
    logger.error(`Razorpay createOrder failed: ${err.message}`);
    throw err;
  }
}

/**
 * Verifies Razorpay payment signature using HMAC-SHA256.
 * Must be called after user completes checkout — validates the payment authenticity.
 *
 * @param {string} razorpayOrderId   - From Razorpay checkout response
 * @param {string} razorpayPaymentId - From Razorpay checkout response
 * @param {string} razorpaySignature - From Razorpay checkout response
 * @returns {boolean} true if signature is valid
 */
export function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const body        = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSig = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');

  return expectedSig === razorpaySignature;
}

/**
 * Fetches full payment details from Razorpay.
 * Used to double-check amount + status after verification.
 *
 * @param {string} paymentId
 */
export async function fetchPayment(paymentId) {
  try {
    return await getRazorpay().payments.fetch(paymentId);
  } catch (err) {
    logger.error(`Razorpay fetchPayment failed: ${err.message}`);
    throw err;
  }
}

/**
 * Creates a Razorpay subscription (recurring billing).
 * Used for monthly/annual auto-renewal plans.
 *
 * @param {string} razorpayPlanId - Razorpay plan ID (created in dashboard)
 * @param {number} totalCount     - Total billing cycles (12 for annual, 1 for monthly)
 * @param {Object} notes
 */
export async function createSubscription(razorpayPlanId, totalCount = 12, notes = {}) {
  try {
    const razorpay    = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id:     razorpayPlanId,
      total_count: totalCount,
      notes,
    });
    logger.info(`Razorpay subscription created: ${subscription.id}`);
    return subscription;
  } catch (err) {
    logger.error(`Razorpay createSubscription failed: ${err.message}`);
    throw err;
  }
}

/**
 * Cancels an active Razorpay subscription.
 * cancelAtCycleEnd: true → cancels after the current billing period ends.
 *
 * @param {string}  subscriptionId
 * @param {boolean} cancelAtCycleEnd
 */
export async function cancelSubscription(subscriptionId, cancelAtCycleEnd = true) {
  try {
    const razorpay = getRazorpay();
    const result   = await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    logger.info(`Razorpay subscription cancelled: ${subscriptionId}`);
    return result;
  } catch (err) {
    logger.error(`Razorpay cancelSubscription failed: ${err.message}`);
    throw err;
  }
}
