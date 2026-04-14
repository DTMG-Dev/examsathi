import { WeakArea, Question } from '../models/index.js';
import { logger } from '../utils/logger.js';
import * as claudeService from './claude.service.js';

// ─── Priority thresholds (must match WeakArea.model.js pre-save hook) ─────────
function getPriority(accuracy) {
  if (accuracy < 40) return 'critical';
  if (accuracy < 70) return 'moderate';
  return 'good';
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * After every test, update (or create) WeakArea records for each topic attempted.
 *
 * @param {string}  userId      - Mongoose ObjectId string
 * @param {Object}  testSession - Populated TestSession document (questions[])
 */
export async function updateWeakAreas(userId, testSession) {
  try {
    const { exam, questions } = testSession;

    // Group question results by (subject, topic)
    const topicMap = new Map();
    for (const q of questions) {
      // questions may be populated or reference objects
      const subject = q.questionId?.subject ?? q.subject;
      const topic   = q.questionId?.topic   ?? q.topic;
      if (!subject || !topic) continue;

      const key = `${subject}||${topic}`;
      if (!topicMap.has(key)) {
        topicMap.set(key, { subject, topic, total: 0, correct: 0 });
      }
      const entry = topicMap.get(key);
      entry.total += 1;
      if (q.isCorrect) entry.correct += 1;
    }

    // Upsert each topic's WeakArea record in parallel
    const ops = Array.from(topicMap.values()).map(async ({ subject, topic, total, correct }) => {
      try {
        let wa = await WeakArea.findOne({ userId, exam, subject, topic });

        if (!wa) {
          wa = new WeakArea({
            userId,
            exam,
            subject,
            topic,
            totalAttempts: 0,
            correctAttempts: 0,
          });
        }

        // Manually accumulate — recordAttempt() works per question,
        // but we batch by topic here to avoid N+1 individual saves.
        wa.totalAttempts   += total;
        wa.correctAttempts += correct;

        // recentScores: append a per-session topic accuracy score (0–100)
        const sessionAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        wa.recentScores = [...wa.recentScores.slice(-9), sessionAccuracy];
        wa.lastAttempted = new Date();
        wa.repetitionCount += 1;

        // Recalculate accuracy manually (pre-save hook also does it, but we need
        // accurate priority/nextReviewDate for the response).
        const newAccuracy = Math.round((wa.correctAttempts / wa.totalAttempts) * 100);
        wa.accuracy = newAccuracy;

        const priority = getPriority(newAccuracy);
        wa.priority = priority;

        // Mastery check
        if (newAccuracy >= 85 && wa.totalAttempts >= 5) {
          if (!wa.isMastered) {
            wa.isMastered = true;
            wa.masteredAt = new Date();
          }
        } else {
          wa.isMastered = false;
          wa.masteredAt = null;
        }

        // Let the model's pre-save hook own SRS interval logic
        await wa.save();
      } catch (err) {
        logger.error(`WeakArea update failed for ${subject}/${topic}: ${err.message}`);
      }
    });

    await Promise.allSettled(ops);
  } catch (err) {
    logger.error(`updateWeakAreas error: ${err.message}`);
    // Non-critical — don't propagate; test already saved.
  }
}

/**
 * Return all weak areas due for spaced repetition review today.
 *
 * @param {string} userId
 * @returns {Promise<WeakArea[]>}
 */
export async function getDueForReview(userId) {
  const now = new Date();
  return WeakArea.find({
    userId,
    isMastered: false,
    nextReviewDate: { $lte: now },
  })
    .sort({ priority: 1, nextReviewDate: 1 }) // critical first, oldest first
    .lean();
}

/**
 * Fetch (or AI-generate) questions targeting the user's critical + moderate weak areas.
 *
 * Strategy:
 *  1. Find unmastered weak areas sorted by priority (critical first).
 *  2. For each topic, pull existing DB questions (to avoid re-generating every time).
 *  3. If a topic has < 3 questions in DB, queue for AI generation.
 *  4. Return a shuffled mixed set of `count` questions.
 *
 * @param {string} userId
 * @param {number} count     - Desired total question count (default 20)
 * @returns {Promise<{questions: Question[], weakAreasSampled: Object[]}>}
 */
export async function getWeakAreaQuestions(userId, count = 20) {
  // Step 1: get unmastered weak areas (critical + moderate)
  const weakAreas = await WeakArea.find({
    userId,
    isMastered: false,
    priority: { $in: ['critical', 'moderate'] },
  })
    .sort({ priority: 1, accuracy: 1 }) // lowest accuracy first within priority
    .limit(10)
    .lean();

  if (weakAreas.length === 0) {
    return { questions: [], weakAreasSampled: [] };
  }

  // Step 2: fetch existing DB questions for these topics
  const perTopicLimit = Math.ceil(count / weakAreas.length) + 2; // small buffer
  const allQuestions  = [];
  const needsGeneration = [];

  await Promise.all(
    weakAreas.map(async (wa) => {
      const dbQuestions = await Question.find({
        exam: wa.exam,
        subject: wa.subject,
        topic: wa.topic,
        isActive: true,
      })
        .limit(perTopicLimit)
        .lean();

      if (dbQuestions.length >= 3) {
        allQuestions.push(...dbQuestions);
      } else {
        needsGeneration.push(wa);
        allQuestions.push(...dbQuestions); // include what's there
      }
    }),
  );

  // Step 3: AI-generate for under-represented topics (max 3 topics to avoid rate-limit)
  const toGenerate = needsGeneration.slice(0, 3);
  if (toGenerate.length > 0) {
    try {
      const aiResults = await claudeService.generateSpacedRepetitionQuestions({
        weakAreas: toGenerate.map((wa) => ({
          exam: wa.exam,
          subject: wa.subject,
          topic: wa.topic,
          priority: wa.priority,
          accuracy: wa.accuracy,
        })),
        userId,
      });

      // Persist + collect
      for (const group of aiResults) {
        if (!Array.isArray(group.questions)) continue;
        const docs = group.questions.map((q) => ({
          exam: group.exam,
          subject: group.subject,
          topic: group.topic,
          difficulty: 'medium',
          language: 'English',
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? '',
          tags: q.tags ?? [],
          isAIGenerated: true,
          createdBy: null,
        }));

        const inserted = await Question.insertMany(docs, { ordered: false }).catch(
          (e) => { logger.warn(`Weak area question insert partial: ${e.message}`); return []; },
        );
        allQuestions.push(...inserted);
      }
    } catch (err) {
      logger.warn(`AI generation for weak areas skipped: ${err.message}`);
    }
  }

  // Step 4: Shuffle and cap at `count`
  const shuffled = allQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return {
    questions: shuffled,
    weakAreasSampled: weakAreas.map((wa) => ({
      subject: wa.subject,
      topic: wa.topic,
      accuracy: wa.accuracy,
      priority: wa.priority,
    })),
  };
}

/**
 * Aggregate subject-level heatmap data for the dashboard.
 *
 * @param {string} userId
 * @param {string} [exam]  - Optional exam filter
 * @returns {Promise<Object[]>}  Array of { subject, avgAccuracy, topics[], topicsCount, criticalCount }
 */
export async function getSubjectHeatmap(userId, exam) {
  const filter = { userId, ...(exam ? { exam } : {}) };
  const areas   = await WeakArea.find(filter).lean();

  const subjectMap = new Map();
  for (const wa of areas) {
    if (!subjectMap.has(wa.subject)) {
      subjectMap.set(wa.subject, { subject: wa.subject, topics: [], totalAccuracy: 0 });
    }
    const s = subjectMap.get(wa.subject);
    s.topics.push({
      topic:     wa.topic,
      accuracy:  wa.accuracy,
      priority:  wa.priority,
      isMastered: wa.isMastered,
      trend:     wa.recentScores.length >= 3 ? computeTrend(wa.recentScores) : 'insufficient_data',
    });
    s.totalAccuracy += wa.accuracy;
  }

  return Array.from(subjectMap.values()).map((s) => ({
    subject:       s.subject,
    avgAccuracy:   s.topics.length > 0 ? Math.round(s.totalAccuracy / s.topics.length) : 0,
    topicsCount:   s.topics.length,
    criticalCount: s.topics.filter((t) => t.priority === 'critical').length,
    masteredCount: s.topics.filter((t) => t.isMastered).length,
    topics:        s.topics.sort((a, b) => a.accuracy - b.accuracy), // weakest first
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrend(recentScores) {
  if (recentScores.length < 3) return 'insufficient_data';
  const recent = recentScores.slice(-3);
  const older  = recentScores.slice(-6, -3);
  if (!older.length) return 'insufficient_data';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg  = older.reduce((a, b) => a + b, 0)  / older.length;
  if (recentAvg > olderAvg + 10) return 'improving';
  if (recentAvg < olderAvg - 10) return 'declining';
  return 'stable';
}
