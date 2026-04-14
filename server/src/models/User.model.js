import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'institute'],
      default: 'free',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: false },
    razorpaySubscriptionId: { type: String },
    razorpayOrderId: { type: String },
  },
  { _id: false },
);

const streakSchema = new mongoose.Schema(
  {
    current: { type: Number, default: 0, min: 0 },
    longest: { type: Number, default: 0, min: 0 },
    lastStudied: { type: Date },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ['student', 'parent', 'institute_admin', 'super_admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'student',
    },

    phone: {
      type: String,
      trim: true,
      match: [/^\+91[0-9]{10}$/, 'Phone must be a valid Indian number (+91XXXXXXXXXX)'],
    },

    profilePic: {
      type: String,
      default: null,
    },

    preferredLanguage: {
      type: String,
      enum: {
        values: ['en', 'hi', 'te', 'ta'],
        message: '{VALUE} is not a supported language',
      },
      default: 'en',
    },

    targetExam: {
      type: String,
      enum: {
        values: ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'],
        message: '{VALUE} is not a supported exam',
      },
    },

    examDate: {
      type: Date,
    },

    dailyStudyHours: {
      type: Number,
      min: [0.5, 'Minimum daily study hours is 0.5'],
      max: [16, 'Maximum daily study hours is 16'],
      default: 4,
    },

    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      default: null,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    subscription: {
      type: subscriptionSchema,
      default: () => ({}),
    },

    streak: {
      type: streakSchema,
      default: () => ({}),
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    refreshToken: {
      type: String,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Strip all sensitive fields from every JSON serialisation
        delete ret.password;
        delete ret.refreshToken;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ targetExam: 1 });
userSchema.index({ instituteId: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ 'subscription.isActive': 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'streak.lastStudied': 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// ── Pre-save hook — hash password only when modified ──────────────────────────

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, config.bcrypt.saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Compares a plain-text password against the stored bcrypt hash.
 * @param {string} candidatePassword - Plain-text password from the login request
 * @returns {Promise<boolean>} true if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Updates the user's streak based on today's date.
 * - Same day → no change
 * - Consecutive day → increment current + update longest
 * - Gap > 1 day → reset current to 1
 */
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.streak.lastStudied) {
    this.streak.current = 1;
    this.streak.longest = 1;
    this.streak.lastStudied = now;
    return;
  }

  const lastStudied = new Date(this.streak.lastStudied);
  const lastStudiedDay = new Date(
    lastStudied.getFullYear(),
    lastStudied.getMonth(),
    lastStudied.getDate(),
  );

  const diffDays = Math.floor(
    (today.getTime() - lastStudiedDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return; // Already studied today

  if (diffDays === 1) {
    this.streak.current += 1;
    if (this.streak.current > this.streak.longest) {
      this.streak.longest = this.streak.current;
    }
  } else {
    this.streak.current = 1; // Streak broken
  }

  this.streak.lastStudied = now;
};

// ── Model export ──────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
export default User;
