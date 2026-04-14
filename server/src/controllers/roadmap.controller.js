import { StudyRoadmap, WeakArea, User } from '../models/index.js';
import { generateStudyRoadmap } from '../services/claude.service.js';
import { logger } from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(date) {
  return Math.max(0, Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Converts the AI-returned weeks array to the Mongoose WeekPlan subdoc format.
 * Computes startDate/endDate for each week using weekNumber offset from today.
 */
function buildWeeks(aiWeeks = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return aiWeeks.map((w) => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + (w.weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const topics = (w.topics ?? []).map((t) => ({
      subject: t.subject ?? '',
      topic: t.topic ?? '',
      targetDate: t.targetDate
        ? new Date(t.targetDate)
        : new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      estimatedHours: Number(t.estimatedHours) || 2,
      isCompleted: false,
      completedAt: null,
      resources: Array.isArray(t.resources) ? t.resources : [],
    }));

    return {
      weekNumber: w.weekNumber,
      startDate: weekStart,
      endDate: weekEnd,
      weeklyGoalHours: topics.reduce((s, t) => s + t.estimatedHours, 0),
      topics,
    };
  });
}

// ── Core generation logic (shared by generate + regenerate) ───────────────────

async function runGeneration(userId, overrides = {}) {
  const user = await User.findById(userId)
    .select('targetExam examDate dailyStudyHours')
    .lean();

  const exam = overrides.exam || user?.targetExam;
  const examDate = overrides.examDate || user?.examDate;
  const dailyHours = overrides.dailyHours || user?.dailyStudyHours || 4;

  if (!exam || !examDate) {
    const err = new Error('Exam and exam date are required — set them in your profile first');
    err.statusCode = 400;
    throw err;
  }

  // Collect weak areas for the prompt
  const weakAreaDocs = await WeakArea.find({ userId, isMastered: false })
    .sort({ accuracy: 1 })
    .limit(10)
    .lean();

  const weakAreas = weakAreaDocs.map(
    (wa) => `${wa.subject} - ${wa.topic} (${wa.accuracy}% accuracy)`,
  );

  const daysRemaining = daysFromNow(examDate);

  logger.info(
    `[roadmap.controller] Calling Claude — exam=${exam}, days=${daysRemaining}, weakAreas=${weakAreas.length}`,
  );

  const aiResult = await generateStudyRoadmap({
    exam,
    examDate,
    dailyHours,
    weakAreas,
    daysRemaining,
  });

  // Deactivate any existing active roadmap for this exam
  await StudyRoadmap.updateOne({ userId, exam, isActive: true }, { isActive: false });

  const roadmap = await StudyRoadmap.create({
    userId,
    exam,
    examDate,
    dailyHours,
    weeks: buildWeeks(aiResult.weeks),
    weakAreasFocused: weakAreaDocs.map((wa) => wa.topic),
    aiGeneratedAt: new Date(),
    isActive: true,
  });

  // Attach strategy from AI (not persisted in schema, but returned to client)
  const result = roadmap.toJSON();
  result.strategy = aiResult.strategy ?? '';

  logger.info(
    `[roadmap.controller] Roadmap created — id=${roadmap._id}, weeks=${roadmap.weeks.length}`,
  );

  return result;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/roadmap/generate
 * Generates a new AI study roadmap using the user's profile + weak areas.
 * Optional body overrides: { exam, examDate, dailyHours }
 */
export async function generateRoadmap(req, res, next) {
  try {
    const roadmap = await runGeneration(req.user.userId, req.body);
    return res.status(201).json({
      success: true,
      data: roadmap,
      message: 'Study roadmap generated successfully',
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message, code: 400 });
    }
    next(err);
  }
}

/**
 * GET /api/roadmap
 * Returns the user's current active roadmap, or null if none exists.
 */
export async function getRoadmap(req, res, next) {
  try {
    const roadmap = await StudyRoadmap.findOne({
      userId: req.user.userId,
      isActive: true,
    }).lean();

    return res.status(200).json({
      success: true,
      data: roadmap ?? null,
      message: roadmap ? 'Roadmap fetched successfully' : 'No active roadmap found',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/roadmap/topic/:topicId
 * Marks a single topic as complete or incomplete.
 * Body: { isCompleted: boolean }
 * Returns: { overallProgress: number }
 */
export async function updateTopicStatus(req, res, next) {
  try {
    const { topicId } = req.params;
    const { isCompleted } = req.body;

    if (typeof isCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isCompleted (boolean) is required',
        code: 400,
      });
    }

    const roadmap = await StudyRoadmap.findOne({
      userId: req.user.userId,
      isActive: true,
    });
    if (!roadmap) {
      return res.status(404).json({ success: false, error: 'No active roadmap', code: 404 });
    }

    // Find topic across all weeks using Mongoose DocumentArray .id()
    let found = false;
    for (const week of roadmap.weeks) {
      const topic = week.topics.id(topicId);
      if (topic) {
        topic.isCompleted = isCompleted;
        topic.completedAt = isCompleted ? new Date() : null;
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, error: 'Topic not found', code: 404 });
    }

    await roadmap.save(); // pre-save hook recalculates overallProgress

    return res.status(200).json({
      success: true,
      data: { overallProgress: roadmap.overallProgress },
      message: `Topic marked as ${isCompleted ? 'complete' : 'incomplete'}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/roadmap/regenerate
 * Creates a fresh roadmap, replacing the current one.
 * Accepts the same optional body overrides as generate.
 */
export async function regenerateRoadmap(req, res, next) {
  try {
    const roadmap = await runGeneration(req.user.userId, req.body);
    return res.status(201).json({
      success: true,
      data: roadmap,
      message: 'Study roadmap regenerated successfully',
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message, code: 400 });
    }
    next(err);
  }
}
