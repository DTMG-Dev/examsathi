import mongoose from 'mongoose';

// ─── Schema ───────────────────────────────────────────────────────────────────

const planSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    tagline: {
      type: String,
      trim: true,
    },

    // Maps to User.subscription.plan enum value
    userPlanKey: {
      type: String,
      enum: ['free', 'basic', 'pro', 'institute'],
      required: true,
    },

    type: {
      type: String,
      enum: ['individual', 'family', 'institute'],
      default: 'individual',
    },

    priceMonthly: {
      type: Number,  // ₹ INR
      required: true,
      min: 0,
    },

    // Annual price (per month, already discounted)
    priceAnnual: {
      type: Number,
      min: 0,
    },

    // Optional Razorpay plan IDs (set after creating plans in Razorpay dashboard)
    razorpayPlanIdMonthly: { type: String, default: null },
    razorpayPlanIdAnnual:  { type: String, default: null },

    features: {
      type: [String],
      default: [],
    },

    limits: {
      questionsPerDay: { type: Number, default: null }, // null = unlimited
      subjects:        { type: Number, default: null }, // null = all
      studentsMax:     { type: Number, default: null }, // institute plans
      testsPerMonth:   { type: Number, default: null },
      aiDoubts:        { type: Boolean, default: false },
      hindiSupport:    { type: Boolean, default: false },
      analytics:       { type: Boolean, default: false },
      parentDashboard: { type: Boolean, default: false },
      downloadPDF:     { type: Boolean, default: false },
    },

    isPopular:  { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },
    sortOrder:  { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) { delete ret.__v; return ret; },
    },
  },
);

planSchema.index({ isActive: 1, sortOrder: 1 });

const Plan = mongoose.model('Plan', planSchema);
export default Plan;

// ─── Seed helper ──────────────────────────────────────────────────────────────

export const PLAN_SEEDS = [
  {
    slug:        'free',
    name:        'Free',
    tagline:     'Get started, no credit card needed',
    userPlanKey: 'free',
    type:        'individual',
    priceMonthly: 0,
    priceAnnual:  0,
    sortOrder:   0,
    isPopular:   false,
    features: [
      '10 AI questions per day',
      '1 subject only',
      'Basic test engine',
      'Performance dashboard',
      'Community support',
    ],
    limits: {
      questionsPerDay: 10,
      subjects:        1,
      testsPerMonth:   5,
      aiDoubts:        false,
      hindiSupport:    false,
      analytics:       false,
      parentDashboard: false,
      downloadPDF:     false,
    },
  },
  {
    slug:        'student',
    name:        'Student',
    tagline:     'Everything you need to crack your exam',
    userPlanKey: 'basic',
    type:        'individual',
    priceMonthly: 299,
    priceAnnual:  209, // 30% off
    sortOrder:   1,
    isPopular:   false,
    features: [
      'Unlimited AI questions',
      'All subjects covered',
      'Unlimited tests & results',
      'AI-powered study roadmap',
      'Weak area detection',
      'Spaced repetition system',
      'Previous year questions (PYQ)',
      'Email support',
    ],
    limits: {
      questionsPerDay: null,
      subjects:        null,
      testsPerMonth:   null,
      aiDoubts:        false,
      hindiSupport:    false,
      analytics:       true,
      parentDashboard: false,
      downloadPDF:     true,
    },
  },
  {
    slug:        'pro',
    name:        'Pro',
    tagline:     'Maximum edge with AI assistance',
    userPlanKey: 'pro',
    type:        'individual',
    priceMonthly: 599,
    priceAnnual:  419, // 30% off
    sortOrder:   2,
    isPopular:   true,
    features: [
      'Everything in Student',
      'AI Doubt Solver (unlimited)',
      'Hindi + regional language UI',
      'Advanced analytics & heatmaps',
      'Adaptive weak area tests',
      'Download tests as PDF',
      'Priority support',
      'Early access to new features',
    ],
    limits: {
      questionsPerDay: null,
      subjects:        null,
      testsPerMonth:   null,
      aiDoubts:        true,
      hindiSupport:    true,
      analytics:       true,
      parentDashboard: false,
      downloadPDF:     true,
    },
  },
  {
    slug:        'family',
    name:        'Family',
    tagline:     'Student plan + parent progress dashboard',
    userPlanKey: 'basic',
    type:        'family',
    priceMonthly: 399,
    priceAnnual:  279, // 30% off
    sortOrder:   3,
    isPopular:   false,
    features: [
      'Everything in Student',
      'Parent progress dashboard',
      'Weekly performance reports for parents',
      'Study time monitoring',
      'Goal-setting with parent oversight',
    ],
    limits: {
      questionsPerDay: null,
      subjects:        null,
      testsPerMonth:   null,
      aiDoubts:        false,
      hindiSupport:    false,
      analytics:       true,
      parentDashboard: true,
      downloadPDF:     true,
    },
  },
  {
    slug:        'institute_starter',
    name:        'Institute Starter',
    tagline:     'For small coaching centres',
    userPlanKey: 'institute',
    type:        'institute',
    priceMonthly: 2999,
    priceAnnual:  2099,
    sortOrder:   4,
    isPopular:   false,
    features: [
      'Up to 50 students',
      'White-label portal',
      'Batch management',
      'Assign tests to batches',
      'Student performance analytics',
      'Bulk question generation',
      'Dedicated support',
    ],
    limits: {
      questionsPerDay: null,
      subjects:        null,
      studentsMax:     50,
      testsPerMonth:   null,
      aiDoubts:        false,
      hindiSupport:    false,
      analytics:       true,
      parentDashboard: false,
      downloadPDF:     true,
    },
  },
  {
    slug:        'institute_pro',
    name:        'Institute Pro',
    tagline:     'For large coaching centres & schools',
    userPlanKey: 'institute',
    type:        'institute',
    priceMonthly: 7999,
    priceAnnual:  5599,
    sortOrder:   5,
    isPopular:   false,
    features: [
      'Up to 200 students',
      'Everything in Institute Starter',
      'AI Doubt Solver for all students',
      'Advanced institute analytics',
      'Custom branding & domain',
      'API access',
      'Dedicated account manager',
      'SLA-backed support',
    ],
    limits: {
      questionsPerDay: null,
      subjects:        null,
      studentsMax:     200,
      testsPerMonth:   null,
      aiDoubts:        true,
      hindiSupport:    true,
      analytics:       true,
      parentDashboard: false,
      downloadPDF:     true,
    },
  },
];
