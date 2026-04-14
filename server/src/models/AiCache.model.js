import mongoose from 'mongoose';

/**
 * Stores cached AI responses keyed by a SHA-256 hash of the input parameters.
 * TTL index automatically removes documents after 30 days.
 * Prevents duplicate Claude API calls for identical prompts — saves cost.
 */
const aiCacheSchema = new mongoose.Schema(
  {
    promptHash: {
      type: String,
      required: true,
    },

    /** Parsed JSON response from Claude — stored as-is */
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    /** Which Claude function generated this response */
    fnName: {
      type: String,
      enum: [
        'generateMCQs',
        'generateStudyRoadmap',
        'analyzeWeakAreas',
        'solveDoubt',
        'generateSpacedRepetitionQuestions',
      ],
      required: true,
    },

    exam: {
      type: String,
      enum: ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'],
    },

    model: {
      type: String,
      default: 'claude-sonnet-4-20250514',
    },

    /** TTL field — MongoDB auto-deletes document 30 days after creation */
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 30, // 30 days in seconds
    },
  },
);

aiCacheSchema.index({ promptHash: 1 }, { unique: true });
aiCacheSchema.index({ fnName: 1 });
aiCacheSchema.index({ exam: 1 });

const AiCache = mongoose.model('AiCache', aiCacheSchema);
export default AiCache;
