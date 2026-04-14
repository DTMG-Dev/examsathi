import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'moderator', 'member'],
        message: '{VALUE} is not a valid member role',
      },
      default: 'member',
    },
  },
  { _id: false },
);

const challengeParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number, // Seconds
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      maxlength: [200, 'Challenge title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Challenge description cannot exceed 1000 characters'],
    },
    topic: {
      type: String,
      required: [true, 'Challenge topic is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Challenge subject is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty',
      },
      required: true,
    },
    questionCount: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Challenge due date is required'],
      validate: {
        validator(date) {
          return date > new Date();
        },
        message: 'Due date must be in the future',
      },
    },
    participants: {
      type: [challengeParticipantSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const studyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [3, 'Group name must be at least 3 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },

    exam: {
      type: String,
      required: [true, 'Exam type is required'],
      enum: {
        values: ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'],
        message: '{VALUE} is not a supported exam',
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Group creator reference is required'],
    },

    members: {
      type: [memberSchema],
      validate: {
        validator(members) {
          return members.length <= 100;
        },
        message: 'A study group cannot exceed 100 members',
      },
      default: [],
    },

    challenges: {
      type: [challengeSchema],
      default: [],
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    inviteCode: {
      type: String,
      default: null,
    },

    maxMembers: {
      type: Number,
      default: 50,
      min: 2,
      max: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Leaderboard refreshed via cron
    leaderboard: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          totalScore: { type: Number, default: 0 },
          challengesCompleted: { type: Number, default: 0 },
          rank: { type: Number },
          _id: false,
        },
      ],
      default: [],
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
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

studyGroupSchema.index({ createdBy: 1 });
studyGroupSchema.index({ exam: 1, isPublic: 1 });
studyGroupSchema.index({ 'members.userId': 1 });
studyGroupSchema.index({ inviteCode: 1 }, { sparse: true });
studyGroupSchema.index({ isActive: 1, isPublic: 1, exam: 1 });
studyGroupSchema.index({ lastActivityAt: -1 });
studyGroupSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

/**
 * Returns the current number of members in the group.
 */
studyGroupSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

/**
 * Returns whether the group has reached its member limit.
 */
studyGroupSchema.virtual('isFull').get(function () {
  return this.members.length >= this.maxMembers;
});

/**
 * Returns only active (not expired) challenges.
 */
studyGroupSchema.virtual('activeChallenges').get(function () {
  const now = new Date();
  return this.challenges.filter((c) => c.isActive && c.dueDate > now);
});

// ── Model export ──────────────────────────────────────────────────────────────

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
export default StudyGroup;
