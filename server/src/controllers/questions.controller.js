import { Question } from '../models/index.js';
import * as claudeService from '../services/claude.service.js';
import { logger } from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_EXAMS = ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_LANGUAGES = ['en', 'hi'];

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message, code: 400 });
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/questions/generate
 *
 * Calls the Claude service to generate MCQs, persists each question,
 * and returns the saved documents. Cache-aware — repeat calls with the
 * same params return the cached result without a new API call.
 */
export async function generateQuestions(req, res, next) {
  try {
    const {
      exam,
      subject,
      topic,
      difficulty = 'medium',
      count = 10,
      language = 'en',
    } = req.body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!exam) return badRequest(res, 'exam is required');
    if (!subject) return badRequest(res, 'subject is required');
    if (!topic) return badRequest(res, 'topic is required');

    if (!VALID_EXAMS.includes(exam)) {
      return badRequest(res, `exam must be one of: ${VALID_EXAMS.join(', ')}`);
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return badRequest(res, `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return badRequest(res, `language must be 'en' or 'hi'`);
    }

    const questionCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);

    logger.info(
      `[questions.controller] generateQuestions — user=${req.user.userId}, ${exam}/${subject}/${topic}, diff=${difficulty}, count=${questionCount}`,
    );

    // ── Generate via Claude (cache-aware) ──────────────────────────────────
    const generated = await claudeService.generateMCQs({
      exam,
      subject,
      topic,
      difficulty,
      count: questionCount,
      language,
    });

    if (!Array.isArray(generated) || generated.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'AI returned no questions. Please try again.',
        code: 500,
      });
    }

    // ── Persist to DB ──────────────────────────────────────────────────────
    const toSave = generated.map((q) => ({
      exam,
      subject,
      topic,
      difficulty,
      language,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      tags: Array.isArray(q.tags) ? q.tags : [],
      isAIGenerated: true,
      isPYQ: false,
      createdBy: req.user.userId,
    }));

    // ordered: false — partial failures don't block valid documents
    const saved = await Question.insertMany(toSave, { ordered: false });

    return res.status(201).json({
      success: true,
      data: {
        questions: saved,
        count: saved.length,
        exam,
        subject,
        topic,
        difficulty,
        language,
      },
      message: `${saved.length} questions generated successfully`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/questions
 *
 * Returns paginated questions filtered by any combination of
 * exam / subject / topic / difficulty / language.
 */
export async function getQuestions(req, res, next) {
  try {
    const {
      exam,
      subject,
      topic,
      difficulty,
      language,
      page = '1',
      limit = '20',
    } = req.query;

    const filter = { isActive: true };
    if (exam) filter.exam = exam;
    if (subject) filter.subject = subject;
    if (topic) filter.topic = { $regex: new RegExp(topic, 'i') };
    if (difficulty) filter.difficulty = difficulty;
    if (language) filter.language = language;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      message: 'Questions fetched successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/questions/pyq
 *
 * Returns previous-year questions, optionally filtered by exam / subject / year.
 * Also returns the list of distinct available years for the given exam.
 */
export async function getPYQs(req, res, next) {
  try {
    const { exam, subject, year, page = '1', limit = '20' } = req.query;

    const filter = { isPYQ: true, isActive: true };
    if (exam) filter.exam = exam;
    if (subject) filter.subject = subject;
    if (year) filter.pyqYear = parseInt(year, 10);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const [questions, total, availableYears] = await Promise.all([
      Question.find(filter)
        .select('-__v')
        .sort({ pyqYear: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(filter),
      Question.distinct('pyqYear', {
        isPYQ: true,
        isActive: true,
        ...(exam ? { exam } : {}),
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        availableYears: availableYears.filter(Boolean).sort((a, b) => b - a),
      },
      message: 'Previous year questions fetched successfully',
    });
  } catch (err) {
    next(err);
  }
}
