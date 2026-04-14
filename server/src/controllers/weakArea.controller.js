import { WeakArea, TestSession } from '../models/index.js';
import { logger } from '../utils/logger.js';
import * as weakAreaService from '../services/weakArea.service.js';
import * as claudeService from '../services/claude.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(res, data, message = 'OK') {
  return res.json({ success: true, data, message });
}

function badRequest(res, msg) {
  return res.status(400).json({ success: false, error: msg, code: 400 });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/weak-areas
 * Returns all weak areas for the user, grouped by subject, with heatmap data.
 */
export async function getWeakAreas(req, res, next) {
  try {
    const userId = req.user.userId;
    const { exam } = req.query;

    const PRIORITY_ORDER = { critical: 0, moderate: 1, good: 2 };

    const [allAreas, heatmap] = await Promise.all([
      WeakArea.find({ userId, ...(exam ? { exam } : {}) })
        .sort({ accuracy: 1 })   // sort by accuracy ascending; priority reordered in JS below
        .lean(),
      weakAreaService.getSubjectHeatmap(userId, exam),
    ]);

    // Summary counts
    const summary = {
      total:    allAreas.length,
      critical: allAreas.filter((a) => a.priority === 'critical').length,
      moderate: allAreas.filter((a) => a.priority === 'moderate').length,
      good:     allAreas.filter((a) => a.priority === 'good').length,
      mastered: allAreas.filter((a) => a.isMastered).length,
    };

    // Accuracy trend across all topics
    const avgAccuracy =
      allAreas.length > 0
        ? Math.round(allAreas.reduce((s, a) => s + a.accuracy, 0) / allAreas.length)
        : 0;

    // Sort in JS: critical → moderate → good, then by accuracy ascending within each priority
    const sorted = [...allAreas].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      return pa !== pb ? pa - pb : a.accuracy - b.accuracy;
    });

    return ok(res, { summary, avgAccuracy, heatmap, weakAreas: sorted });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/weak-areas/due-reviews
 * Returns topics due for spaced repetition today, sorted by priority.
 */
export async function getDueReviews(req, res, next) {
  try {
    const userId = req.user.userId;
    const due    = await weakAreaService.getDueForReview(userId);

    return ok(res, {
      count:   due.length,
      reviews: due,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/weak-areas/start-practice
 * Generates an adaptive test session targeting the user's weak areas.
 * Body: { count?: number }
 */
export async function startWeakAreaTest(req, res, next) {
  try {
    const userId = req.user.userId;
    const count  = Math.min(parseInt(req.body.count) || 20, 50);

    const { questions, weakAreasSampled } = await weakAreaService.getWeakAreaQuestions(userId, count);

    if (questions.length === 0) {
      return badRequest(res, 'No questions available for your weak areas yet. Complete a test first.');
    }

    // Create a TestSession tagged as adaptive
    const session = await TestSession.create({
      userId,
      exam:           questions[0].exam,
      subject:        'Mixed',
      topics:         [...new Set(questions.map((q) => q.topic))],
      difficulty:     'mixed',
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        questionId:     q._id,
        selectedAnswer: null,
        isCorrect:      false,
        isSkipped:      true,
        timeTaken:      0,
      })),
    });

    return ok(res, {
      sessionId:      session._id,
      totalQuestions: questions.length,
      weakAreasSampled,
      questions,
      isAdaptive:     true,
    }, 'Adaptive practice session started');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/weak-areas/insights
 * Uses Claude AI to analyse the user's weak area patterns and provide
 * personalised study recommendations.
 */
export async function getWeakAreaInsights(req, res, next) {
  try {
    const userId = req.user.userId;
    const { exam } = req.query;

    // Fetch the user's recent test sessions (last 10 completed)
    const recentSessions = await TestSession.find({
      userId,
      status: 'completed',
      ...(exam ? { exam } : {}),
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('exam subject topics accuracy subjectBreakdown completedAt')
      .lean();

    if (recentSessions.length === 0) {
      return ok(res, {
        hasInsights: false,
        message:     'Complete at least one test to get AI insights.',
      });
    }

    // Build test results summary for Claude
    const testResultsSummary = recentSessions.map((s) => ({
      exam:      s.exam,
      topics:    s.topics,
      accuracy:  s.accuracy,
      date:      s.completedAt,
      breakdown: s.subjectBreakdown,
    }));

    const insights = await claudeService.analyzeWeakAreas({
      testResults: testResultsSummary,
      exam:        exam || recentSessions[0]?.exam || 'General',
    });

    // Also get current weak area snapshot
    const weakAreas = await WeakArea.find({ userId, isMastered: false })
      .sort({ accuracy: 1 })
      .limit(5)
      .lean();

    return ok(res, {
      hasInsights: true,
      insights,
      topWeakAreas: weakAreas.map((wa) => ({
        subject:  wa.subject,
        topic:    wa.topic,
        accuracy: wa.accuracy,
        priority: wa.priority,
        trend:    wa.recentScores.length >= 3 ? getTrend(wa.recentScores) : 'insufficient_data',
      })),
      analysedSessions: recentSessions.length,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getTrend(scores) {
  const recent    = scores.slice(-3);
  const older     = scores.slice(-6, -3);
  if (!older.length) return 'insufficient_data';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg  = older.reduce((a, b) => a + b, 0)  / older.length;
  if (recentAvg > olderAvg + 10) return 'improving';
  if (recentAvg < olderAvg - 10) return 'declining';
  return 'stable';
}
