import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const questionAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    isSkipped: {
      type: Boolean,
      default: false,
    },
    timeTaken: {
      type: Number, // Seconds spent on this question
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const testSessionSchema = new mongoose.Schema(
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

    topics: {
      type: [String],
      default: [],
    },

    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard', 'mixed'],
        message: '{VALUE} is not a valid difficulty',
      },
      default: 'mixed',
    },

    questions: {
      type: [questionAttemptSchema],
      validate: {
        validator(qs) {
          return qs.length >= 1 && qs.length <= 200;
        },
        message: 'A test session must have between 1 and 200 questions',
      },
    },

    // ── Computed result fields (set on completion) ──────────────────
    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: [1, 'At least 1 question is required'],
    },

    correctCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    wrongCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    skippedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    accuracy: {
      type: Number, // Percentage 0–100
      default: 0,
      min: 0,
      max: 100,
    },

    timeTaken: {
      type: Number, // Total seconds for the session
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: {
        values: ['ongoing', 'completed', 'abandoned'],
        message: '{VALUE} is not a valid session status',
      },
      default: 'ongoing',
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // AI-generated feedback after test completion
    aiFeedback: {
      type: String,
      default: null,
    },

    // Subject-wise breakdown for results analysis
    subjectBreakdown: {
      type: Map,
      of: new mongoose.Schema(
        {
          total: Number,
          correct: Number,
          wrong: Number,
          accuracy: Number,
        },
        { _id: false },
      ),
      default: {},
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

testSessionSchema.index({ userId: 1, createdAt: -1 });
testSessionSchema.index({ userId: 1, status: 1 });
testSessionSchema.index({ userId: 1, exam: 1, createdAt: -1 });
testSessionSchema.index({ exam: 1, difficulty: 1 });
testSessionSchema.index({ status: 1 });
testSessionSchema.index({ createdAt: -1 });

// ── Pre-save: compute result fields on completion ─────────────────────────────

testSessionSchema.pre('save', function (next) {
  if (this.status !== 'completed' || !this.isModified('status')) return next();

  const answered = this.questions.filter((q) => !q.isSkipped);
  this.correctCount = answered.filter((q) => q.isCorrect).length;
  this.wrongCount = answered.filter((q) => !q.isCorrect).length;
  this.skippedCount = this.questions.filter((q) => q.isSkipped).length;
  this.timeTaken = this.questions.reduce((sum, q) => sum + q.timeTaken, 0);

  const attempted = this.correctCount + this.wrongCount;
  this.accuracy = attempted > 0
    ? Math.round((this.correctCount / attempted) * 100)
    : 0;

  this.completedAt = new Date();
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

/**
 * Returns average time per question in seconds.
 */
testSessionSchema.virtual('avgTimePerQuestion').get(function () {
  if (this.totalQuestions === 0) return 0;
  return Math.round(this.timeTaken / this.totalQuestions);
});

// ── Model export ──────────────────────────────────────────────────────────────

const TestSession = mongoose.model('TestSession', testSessionSchema);
export default TestSession;
