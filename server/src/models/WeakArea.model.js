import mongoose from 'mongoose';

// ── Spaced repetition intervals (days) by priority ───────────────────────────
// Critical → review soon; Good → review less frequently
const SRS_INTERVALS = {
  critical: 1,
  moderate: 4,
  good: 14,
};

// ── Main schema ───────────────────────────────────────────────────────────────

const weakAreaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    exam: {
      type: String,
      required: [true, 'Exam type is required'],
      enum: {
        values: ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'],
        message: '{VALUE} is not a supported exam',
      },
    },

    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },

    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [150, 'Topic cannot exceed 150 characters'],
    },

    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    correctAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    accuracy: {
      type: Number, // Percentage 0–100, recalculated on every update
      default: 0,
      min: 0,
      max: 100,
    },

    lastAttempted: {
      type: Date,
      default: null,
    },

    // Next scheduled review date — set by the spaced repetition engine
    nextReviewDate: {
      type: Date,
      default: Date.now,
    },

    priority: {
      type: String,
      enum: {
        values: ['critical', 'moderate', 'good'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'moderate',
    },

    // SRS repetition count — increases each successful review
    repetitionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Track score history for trend analysis (last 10 attempts)
    recentScores: {
      type: [Number],
      default: [],
      validate: {
        validator(scores) {
          return scores.length <= 10;
        },
        message: 'recentScores stores at most the last 10 scores',
      },
    },

    // Whether this weak area is currently active (not mastered)
    isMastered: {
      type: Boolean,
      default: false,
    },

    masteredAt: {
      type: Date,
      default: null,
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

// One weak-area record per user per exam+subject+topic combination
weakAreaSchema.index(
  { userId: 1, exam: 1, subject: 1, topic: 1 },
  { unique: true },
);

weakAreaSchema.index({ userId: 1, priority: 1 });
weakAreaSchema.index({ userId: 1, exam: 1, priority: 1 });
weakAreaSchema.index({ userId: 1, nextReviewDate: 1 }); // Spaced repetition queries
weakAreaSchema.index({ userId: 1, isMastered: 1 });
weakAreaSchema.index({ accuracy: 1 });
weakAreaSchema.index({ lastAttempted: -1 });

// ── Pre-save: recalculate accuracy + priority + SRS date ─────────────────────

weakAreaSchema.pre('save', function (next) {
  const modifiedFields = ['totalAttempts', 'correctAttempts'];
  const isAttemptUpdate = modifiedFields.some((f) => this.isModified(f));

  if (!isAttemptUpdate) return next();

  // Recalculate accuracy
  this.accuracy =
    this.totalAttempts > 0
      ? Math.round((this.correctAttempts / this.totalAttempts) * 100)
      : 0;

  // Assign priority based on accuracy thresholds
  if (this.accuracy < 40) {
    this.priority = 'critical';
  } else if (this.accuracy < 70) {
    this.priority = 'moderate';
  } else {
    this.priority = 'good';
  }

  // Mark as mastered when accuracy ≥ 85% with at least 5 attempts
  if (this.accuracy >= 85 && this.totalAttempts >= 5) {
    if (!this.isMastered) {
      this.isMastered = true;
      this.masteredAt = new Date();
    }
  } else {
    this.isMastered = false;
    this.masteredAt = null;
  }

  // Set next review date using spaced repetition intervals
  const intervalDays = SRS_INTERVALS[this.priority];
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  this.nextReviewDate = nextReview;

  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Records a new attempt result and updates stats.
 * Keeps only the last 10 attempt scores in recentScores.
 *
 * @param {boolean} isCorrect - Whether the attempt was answered correctly
 */
weakAreaSchema.methods.recordAttempt = function (isCorrect) {
  this.totalAttempts += 1;
  if (isCorrect) this.correctAttempts += 1;

  const score = isCorrect ? 100 : 0;
  this.recentScores = [...this.recentScores.slice(-9), score];
  this.lastAttempted = new Date();
  this.repetitionCount += 1;
};

/**
 * Returns the trend direction based on recent scores.
 * @returns {'improving' | 'declining' | 'stable' | 'insufficient_data'}
 */
weakAreaSchema.methods.getTrend = function () {
  if (this.recentScores.length < 3) return 'insufficient_data';

  const recent = this.recentScores.slice(-3);
  const older = this.recentScores.slice(-6, -3);

  if (older.length === 0) return 'insufficient_data';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (recentAvg > olderAvg + 10) return 'improving';
  if (recentAvg < olderAvg - 10) return 'declining';
  return 'stable';
};

// ── Model export ──────────────────────────────────────────────────────────────

const WeakArea = mongoose.model('WeakArea', weakAreaSchema);
export default WeakArea;
