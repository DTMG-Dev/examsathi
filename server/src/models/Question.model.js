import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const optionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [1000, 'Option text cannot exceed 1000 characters'],
    },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const questionSchema = new mongoose.Schema(
  {
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

    subtopic: {
      type: String,
      trim: true,
      maxlength: [150, 'Subtopic cannot exceed 150 characters'],
      default: null,
    },

    difficulty: {
      type: String,
      required: [true, 'Difficulty level is required'],
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level',
      },
    },

    language: {
      type: String,
      enum: {
        values: ['en', 'hi'],
        message: '{VALUE} is not a supported language',
      },
      default: 'en',
    },

    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [10, 'Question must be at least 10 characters'],
      maxlength: [5000, 'Question cannot exceed 5000 characters'],
    },

    options: {
      type: [optionSchema],
      validate: {
        validator(opts) {
          return opts.length === 4;
        },
        message: 'A question must have exactly 4 options',
      },
    },

    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      enum: {
        values: ['A', 'B', 'C', 'D'],
        message: 'Correct answer must be one of A, B, C, D',
      },
    },

    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
      trim: true,
      maxlength: [5000, 'Explanation cannot exceed 5000 characters'],
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator(tags) {
          return tags.length <= 20;
        },
        message: 'A question cannot have more than 20 tags',
      },
    },

    isAIGenerated: {
      type: Boolean,
      default: false,
    },

    isPYQ: {
      type: Boolean,
      default: false,
    },

    pyqYear: {
      type: Number,
      min: [1990, 'PYQ year cannot be before 1990'],
      max: [new Date().getFullYear(), 'PYQ year cannot be in the future'],
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Question creator reference is required'],
    },

    // Tracks how many times this question has been answered and its success rate
    stats: {
      totalAttempts: { type: Number, default: 0, min: 0 },
      correctAttempts: { type: Number, default: 0, min: 0 },
    },

    isActive: {
      type: Boolean,
      default: true,
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

// Primary query pattern: filter by exam + subject + topic + difficulty
questionSchema.index({ exam: 1, subject: 1, topic: 1, difficulty: 1 });

// Secondary filters
questionSchema.index({ exam: 1, language: 1 });
questionSchema.index({ exam: 1, isPYQ: 1, pyqYear: -1 });
questionSchema.index({ isAIGenerated: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ isActive: 1, exam: 1 });
questionSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

/**
 * Calculates the success rate for this question across all attempts.
 * @returns {number} Percentage (0–100), or 0 if never attempted.
 */
questionSchema.virtual('successRate').get(function () {
  if (this.stats.totalAttempts === 0) return 0;
  return Math.round((this.stats.correctAttempts / this.stats.totalAttempts) * 100);
});

// ── Pre-save validation ───────────────────────────────────────────────────────

questionSchema.pre('save', function (next) {
  // Enforce: pyqYear must be present when isPYQ is true
  if (this.isPYQ && !this.pyqYear) {
    return next(new Error('pyqYear is required when isPYQ is true'));
  }
  // Enforce: pyqYear must not be set when isPYQ is false
  if (!this.isPYQ && this.pyqYear) {
    this.pyqYear = null;
  }
  next();
});

// ── Model export ──────────────────────────────────────────────────────────────

const Question = mongoose.model('Question', questionSchema);
export default Question;
