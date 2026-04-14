import { TestSession, Question, WeakArea, User } from '../models/index.js';
import { logger } from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function notFound(res, msg = 'Test session not found') {
  return res.status(404).json({ success: false, error: msg, code: 404 });
}

function badRequest(res, msg) {
  return res.status(400).json({ success: false, error: msg, code: 400 });
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/tests/start
 * Creates a TestSession from an array of questionIds, returns the session
 * ID and the full question documents.
 */
export async function startTest(req, res, next) {
  try {
    const { questionIds, exam, subject, topic, difficulty = 'mixed' } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return badRequest(res, 'questionIds array is required');
    }
    if (questionIds.length > 200) {
      return badRequest(res, 'Maximum 200 questions per test');
    }

    // Fetch and verify questions exist and are active
    const questions = await Question.find({
      _id: { $in: questionIds },
      isActive: true,
    })
      .select('-__v')
      .lean();

    if (questions.length === 0) {
      return notFound(res, 'No valid questions found for the provided IDs');
    }

    const session = await TestSession.create({
      userId: req.user.userId,
      exam: exam || questions[0].exam,
      subject: subject || questions[0].subject,
      topics: topic ? [topic] : [...new Set(questions.map((q) => q.topic))],
      difficulty,
      totalQuestions: questions.length,
      questions: questions.map((q) => ({
        questionId: q._id,
        selectedAnswer: null,
        isCorrect: false,
        isSkipped: true,
        timeTaken: 0,
      })),
    });

    logger.info(
      `[test.controller] Test started — session=${session._id}, user=${req.user.userId}, questions=${questions.length}`,
    );

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        questions,
        totalQuestions: questions.length,
      },
      message: 'Test session started',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/tests/:id/answer
 * Records (or updates) an answer for a single question in an ongoing session.
 * Does NOT reveal correctness — that happens only on finishTest.
 */
export async function submitAnswer(req, res, next) {
  try {
    const { id } = req.params;
    const { questionId, selectedAnswer, timeTaken = 0 } = req.body;

    if (!questionId || !selectedAnswer) {
      return badRequest(res, 'questionId and selectedAnswer are required');
    }
    if (!['A', 'B', 'C', 'D'].includes(selectedAnswer)) {
      return badRequest(res, 'selectedAnswer must be A, B, C, or D');
    }

    const session = await TestSession.findOne({
      _id: id,
      userId: req.user.userId,
      status: 'ongoing',
    });
    if (!session) return notFound(res, 'Active test session not found');

    const attempt = session.questions.find(
      (q) => q.questionId.toString() === questionId,
    );
    if (!attempt) return notFound(res, 'Question not found in this session');

    attempt.selectedAnswer = selectedAnswer;
    attempt.isSkipped = false;
    attempt.timeTaken = Math.max(0, parseInt(timeTaken, 10) || 0);

    await session.save();

    return res.status(200).json({
      success: true,
      data: { questionId, selectedAnswer },
      message: 'Answer recorded',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tests/:id/finish
 * Scores the test, persists results, updates WeakAreas and user streak.
 * Returns the full result summary.
 */
export async function finishTest(req, res, next) {
  try {
    const { id } = req.params;

    const session = await TestSession.findOne({
      _id: id,
      userId: req.user.userId,
      status: 'ongoing',
    });
    if (!session) return notFound(res, 'Active test session not found');

    // ── Fetch correct answers in one DB round-trip ────────────────────────
    const questionIds = session.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('correctAnswer subject topic exam')
      .lean();
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // ── Compute isCorrect + build subjectBreakdown ────────────────────────
    const breakdown = {};
    for (const attempt of session.questions) {
      const q = qMap.get(attempt.questionId.toString());
      if (!q) continue;

      if (attempt.selectedAnswer) {
        attempt.isCorrect = attempt.selectedAnswer === q.correctAnswer;
        attempt.isSkipped = false;
      } else {
        attempt.isCorrect = false;
        attempt.isSkipped = true;
      }

      if (!breakdown[q.subject]) {
        breakdown[q.subject] = { total: 0, correct: 0, wrong: 0, accuracy: 0 };
      }
      breakdown[q.subject].total++;
      if (attempt.isCorrect) breakdown[q.subject].correct++;
      else if (!attempt.isSkipped) breakdown[q.subject].wrong++;
    }

    for (const s of Object.values(breakdown)) {
      const attempted = s.correct + s.wrong;
      s.accuracy = attempted > 0 ? Math.round((s.correct / attempted) * 100) : 0;
    }

    session.subjectBreakdown = breakdown;
    session.status = 'completed'; // pre-save hook computes correctCount/wrongCount/accuracy
    await session.save();

    // ── Update WeakAreas (grouped by topic, parallel) ─────────────────────
    const topicMap = {};
    for (const attempt of session.questions) {
      const q = qMap.get(attempt.questionId.toString());
      if (!q) continue;
      const key = `${q.exam}||${q.subject}||${q.topic}`;
      if (!topicMap[key]) {
        topicMap[key] = { exam: q.exam, subject: q.subject, topic: q.topic, correct: 0, total: 0 };
      }
      topicMap[key].total++;
      if (attempt.isCorrect) topicMap[key].correct++;
    }

    await Promise.all(
      Object.values(topicMap).map(async ({ exam, subject, topic, correct, total }) => {
        try {
          let wa = await WeakArea.findOne({ userId: req.user.userId, exam, subject, topic });
          if (!wa) wa = new WeakArea({ userId: req.user.userId, exam, subject, topic });

          wa.totalAttempts += total;
          wa.correctAttempts += correct;
          wa.lastAttempted = new Date();
          wa.repetitionCount += 1;
          wa.recentScores = [
            ...wa.recentScores.slice(-9),
            Math.round((correct / total) * 100),
          ];
          await wa.save(); // pre-save recalculates accuracy/priority/SRS date
        } catch (e) {
          logger.warn(`[test.controller] WeakArea update failed — ${topic}: ${e.message}`);
        }
      }),
    );

    // ── Update streak ─────────────────────────────────────────────────────
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.updateStreak();
        await user.save();
      }
    } catch (e) {
      logger.warn(`[test.controller] Streak update failed: ${e.message}`);
    }

    logger.info(
      `[test.controller] Test finished — session=${id}, accuracy=${session.accuracy}%, correct=${session.correctCount}/${session.totalQuestions}`,
    );

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        accuracy: session.accuracy,
        correctCount: session.correctCount,
        wrongCount: session.wrongCount,
        skippedCount: session.skippedCount,
        timeTaken: session.timeTaken,
        totalQuestions: session.totalQuestions,
        subjectBreakdown: Object.fromEntries(session.subjectBreakdown),
        completedAt: session.completedAt,
        exam: session.exam,
        subject: session.subject,
        topics: session.topics,
        difficulty: session.difficulty,
      },
      message: 'Test completed successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tests/history
 * Paginated list of completed test sessions for the current user.
 */
export async function getTestHistory(req, res, next) {
  try {
    const { page = '1', limit = '10', exam } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

    const filter = { userId: req.user.userId, status: 'completed' };
    if (exam) filter.exam = exam;

    const [sessions, total] = await Promise.all([
      TestSession.find(filter)
        .select('-questions -aiFeedback')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      TestSession.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      message: 'Test history fetched successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tests/:id
 * Full detail of a specific test session with populated question data.
 */
export async function getTestDetail(req, res, next) {
  try {
    const { id } = req.params;

    const session = await TestSession.findOne({ _id: id, userId: req.user.userId });
    if (!session) return notFound(res);

    // Populate question documents
    const questionIds = session.questions.map((q) => q.questionId);
    const questionDocs = await Question.find({ _id: { $in: questionIds } })
      .select('-__v')
      .lean();
    const qMap = new Map(questionDocs.map((q) => [q._id.toString(), q]));

    const detailedAttempts = session.questions.map((attempt) => ({
      ...attempt.toObject(),
      question: qMap.get(attempt.questionId.toString()) ?? null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        session: {
          ...session.toJSON(),
          questions: detailedAttempts,
          subjectBreakdown: Object.fromEntries(session.subjectBreakdown),
        },
      },
      message: 'Test detail fetched successfully',
    });
  } catch (err) {
    next(err);
  }
}
