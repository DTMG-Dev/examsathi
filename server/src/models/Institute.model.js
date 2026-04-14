import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      maxlength: [100, 'Batch name cannot exceed 100 characters'],
    },
    exam: {
      type: String,
      required: [true, 'Exam type is required'],
      enum: {
        values: ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'],
        message: '{VALUE} is not a supported exam',
      },
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    assignedTests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSession',
      },
    ],
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const instituteSubscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: {
        values: ['starter', 'growth', 'enterprise'],
        message: '{VALUE} is not a valid institute plan',
      },
      default: 'starter',
    },
    maxStudents: {
      type: Number,
      default: 50,
      min: 1,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    razorpaySubscriptionId: {
      type: String,
    },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const instituteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Institute name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },

    email: {
      type: String,
      required: [true, 'Institute email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+91[0-9]{10}$/, 'Phone must be a valid Indian number (+91XXXXXXXXXX)'],
    },

    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Pincode must be a 6-digit number'],
      },
    },

    // White-label branding
    logo: {
      type: String, // URL to uploaded logo
      default: null,
    },

    brandColor: {
      type: String,
      default: '#FF6B35',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Brand colour must be a valid hex code'],
    },

    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Institute admin reference is required'],
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    batches: {
      type: [batchSchema],
      default: [],
    },

    subscription: {
      type: instituteSubscriptionSchema,
      default: () => ({}),
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Stats refreshed periodically for quick dashboard reads
    stats: {
      totalStudents: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
      testsAssigned: { type: Number, default: 0 },
      avgAccuracy: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

instituteSchema.index({ email: 1 }, { unique: true });
instituteSchema.index({ adminId: 1 }, { unique: true });
instituteSchema.index({ isActive: 1, isVerified: 1 });
instituteSchema.index({ 'subscription.isActive': 1 });
instituteSchema.index({ 'subscription.endDate': 1 });
instituteSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

/**
 * Returns whether the institute has capacity for more students.
 */
instituteSchema.virtual('hasCapacity').get(function () {
  return this.students.length < this.subscription.maxStudents;
});

/**
 * Returns the number of remaining student slots.
 */
instituteSchema.virtual('remainingSlots').get(function () {
  return Math.max(0, this.subscription.maxStudents - this.students.length);
});

// ── Model export ──────────────────────────────────────────────────────────────

const Institute = mongoose.model('Institute', instituteSchema);
export default Institute;
