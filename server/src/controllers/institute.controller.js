import crypto from 'crypto';
import { Institute, User, TestSession, Question } from '../models/index.js';
import { logger } from '../utils/logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(res, data, message = 'OK') {
  return res.json({ success: true, data, message });
}

function badRequest(res, msg) {
  return res.status(400).json({ success: false, error: msg, code: 400 });
}

function notFound(res, msg = 'Not found') {
  return res.status(404).json({ success: false, error: msg, code: 404 });
}

function forbidden(res, msg = 'Forbidden') {
  return res.status(403).json({ success: false, error: msg, code: 403 });
}

/** Find the institute owned by the authenticated user. */
async function findMyInstitute(userId) {
  return Institute.findOne({ adminId: userId, isActive: true });
}

/**
 * Parse CSV string (name,email[,phone]) → array of {name, email, phone?}.
 * Handles quoted fields, trims whitespace.
 */
function parseCsv(csvData) {
  const lines = csvData.trim().split('\n').filter(Boolean);
  const students = [];
  // Skip header row if present (first row contains "name" or "email")
  const start = lines[0].toLowerCase().includes('email') ? 1 : 0;
  for (const line of lines.slice(start)) {
    const [name, email, phone] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      students.push({ name: name || email.split('@')[0], email: email.toLowerCase(), phone });
    }
  }
  return students;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/institute
 * Register a new institute. Caller becomes the admin.
 * Body: { name, email, phone?, address?, brandColor? }
 */
export async function createInstitute(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, email, phone, address, brandColor } = req.body;

    if (!name || !email) return badRequest(res, 'name and email are required.');

    const existing = await Institute.findOne({ adminId: userId });
    if (existing) return badRequest(res, 'You already manage an institute.');

    const emailConflict = await Institute.findOne({ email: email.toLowerCase() });
    if (emailConflict) return badRequest(res, 'An institute with this email already exists.');

    const institute = await Institute.create({
      name,
      email: email.toLowerCase(),
      phone,
      address,
      brandColor: brandColor || '#FF6B35',
      adminId: userId,
      students: [],
      batches: [],
    });

    // Elevate user role to institute_admin
    await User.findByIdAndUpdate(userId, {
      role:        'institute_admin',
      instituteId: institute._id,
    });

    logger.info(`Institute created: ${institute._id} by user ${userId}`);
    return res.status(201).json({ success: true, data: institute, message: 'Institute created successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/institute/stats
 * Returns the authenticated admin's institute + live stats.
 */
export async function getInstituteStats(req, res, next) {
  try {
    const userId = req.user.userId;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'No institute found. Please create one first.');

    const studentIds = institute.students.map((id) => id.toString());

    // Active today = students who logged in within last 24h
    const oneDayAgo = new Date(Date.now() - 86400000);
    const [activeToday, testSessions] = await Promise.all([
      User.countDocuments({
        _id:         { $in: studentIds },
        lastLoginAt: { $gte: oneDayAgo },
      }),
      TestSession.find({
        userId:    { $in: studentIds },
        status:    'completed',
      })
        .select('accuracy score completedAt')
        .lean(),
    ]);

    const avgScore = testSessions.length
      ? Math.round(testSessions.reduce((s, t) => s + t.accuracy, 0) / testSessions.length)
      : 0;

    const testsAssigned = institute.batches.reduce(
      (sum, b) => sum + b.assignedTests.length,
      0,
    );

    // Update cached stats
    institute.stats = {
      totalStudents:  studentIds.length,
      activeStudents: activeToday,
      testsAssigned,
      avgAccuracy:    avgScore,
    };
    await institute.save();

    return ok(res, {
      institute,
      stats: {
        totalStudents:  studentIds.length,
        activeToday,
        avgScore,
        testsAssigned,
        totalTests:     testSessions.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/institute
 * Update institute branding / settings.
 * Body: { name?, brandColor?, logo?, customDomain?, phone?, address? }
 */
export async function updateInstitute(req, res, next) {
  try {
    const userId = req.user.userId;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const allowed = ['name', 'brandColor', 'logo', 'customDomain', 'phone', 'address', 'email'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        institute[field] = req.body[field];
      }
    }
    await institute.save();

    return ok(res, institute, 'Settings updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/institute/batch
 * Create a new student batch inside the institute.
 * Body: { name, exam, startDate?, endDate? }
 */
export async function createBatch(req, res, next) {
  try {
    const userId = req.user.userId;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const { name, exam, startDate, endDate } = req.body;
    if (!name || !exam) return badRequest(res, 'name and exam are required.');

    institute.batches.push({
      name,
      exam,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:   endDate   ? new Date(endDate)   : undefined,
      studentIds:    [],
      assignedTests: [],
      isActive:  true,
    });
    await institute.save();

    const newBatch = institute.batches[institute.batches.length - 1];
    logger.info(`Batch created: ${newBatch._id} in institute ${institute._id}`);
    return res.status(201).json({ success: true, data: newBatch, message: 'Batch created' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/institute/batch/:id/students
 * Add students to a batch. Accepts JSON array or CSV.
 * Body: { students?: [{name, email, phone?}], csvData?: string }
 */
export async function addStudents(req, res, next) {
  try {
    const userId  = req.user.userId;
    const batchId = req.params.id;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const batch = institute.batches.id(batchId);
    if (!batch) return notFound(res, 'Batch not found.');

    // Subscription capacity check
    const maxStudents = institute.subscription?.maxStudents ?? 50;
    const currentCount = institute.students.length;

    // Parse students from body
    let studentList = [];
    if (req.body.csvData) {
      studentList = parseCsv(req.body.csvData);
    } else if (Array.isArray(req.body.students)) {
      studentList = req.body.students;
    } else {
      return badRequest(res, 'Provide students array or csvData string.');
    }

    if (studentList.length === 0) return badRequest(res, 'No valid students found.');
    if (currentCount + studentList.length > maxStudents) {
      return badRequest(res, `Exceeds plan limit. ${maxStudents - currentCount} slots remaining.`);
    }

    const results = { added: [], skipped: [], errors: [] };

    for (const s of studentList) {
      try {
        if (!s.email) { results.errors.push({ email: s.email, reason: 'No email' }); continue; }

        let user = await User.findOne({ email: s.email.toLowerCase() });

        if (!user) {
          const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char password
          user = await User.create({
            name:        s.name || s.email.split('@')[0],
            email:       s.email.toLowerCase(),
            password:    tempPassword,
            phone:       s.phone,
            role:        'student',
            instituteId: institute._id,
          });
          results.added.push({ email: s.email, name: user.name, isNew: true });
        } else {
          results.skipped.push({ email: s.email, reason: 'Account already exists — added to batch' });
        }

        // Link to institute
        if (!institute.students.some((id) => id.toString() === user._id.toString())) {
          institute.students.push(user._id);
        }

        // Link to batch
        if (!batch.studentIds.some((id) => id.toString() === user._id.toString())) {
          batch.studentIds.push(user._id);
        }

        // Set instituteId on user if not set
        if (!user.instituteId) {
          await User.findByIdAndUpdate(user._id, { instituteId: institute._id });
        }
      } catch (err) {
        results.errors.push({ email: s.email, reason: err.message });
      }
    }

    institute.stats.totalStudents = institute.students.length;
    await institute.save();

    logger.info(`Added ${results.added.length} students to batch ${batchId}`);
    return ok(res, results, `Students processed: ${results.added.length} added, ${results.skipped.length} skipped`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/institute/batch/:id/assign-test
 * Create and assign a test to all students in a batch.
 * Body: { exam, subject, topics?, difficulty, questionCount, duration, scheduledAt? }
 */
export async function assignTest(req, res, next) {
  try {
    const userId  = req.user.userId;
    const batchId = req.params.id;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const batch = institute.batches.id(batchId);
    if (!batch) return notFound(res, 'Batch not found.');

    if (batch.studentIds.length === 0) {
      return badRequest(res, 'Batch has no students. Add students first.');
    }

    const {
      exam,
      subject,
      topics,
      difficulty = 'mixed',
      questionCount = 30,
      duration = 60,
      scheduledAt,
    } = req.body;

    if (!exam || !subject) return badRequest(res, 'exam and subject are required.');

    // Fetch random questions matching criteria
    const matchStage = {
      exam,
      subject,
      isActive: true,
      ...(difficulty !== 'mixed' ? { difficulty } : {}),
      ...(Array.isArray(topics) && topics.length ? { topic: { $in: topics } } : {}),
    };

    const questions = await Question.aggregate([
      { $match: matchStage },
      { $sample: { size: Math.min(questionCount, 100) } },
      { $project: { _id: 1 } },
    ]);

    if (questions.length === 0) {
      return badRequest(res, 'No questions found for the given criteria.');
    }

    const questionDocs = questions.map((q) => ({
      questionId:     q._id,
      selectedAnswer: null,
      isCorrect:      false,
      isSkipped:      true,
      timeTaken:      0,
    }));

    // Create one TestSession per student in the batch
    const sessionsToCreate = batch.studentIds.map((studentId) => ({
      userId:         studentId,
      exam,
      subject,
      topics:         Array.isArray(topics) ? topics : [],
      difficulty,
      totalQuestions: questions.length,
      questions:      questionDocs,
      duration,
      status:         'ongoing',
    }));

    const createdSessions = await TestSession.insertMany(sessionsToCreate, { ordered: false });
    const sessionIds = createdSessions.map((s) => s._id);

    // Track assignment in batch
    batch.assignedTests.push(...sessionIds);
    await institute.save();

    logger.info(`Assigned test to batch ${batchId}: ${createdSessions.length} sessions created`);
    return ok(res, {
      sessionsCreated: createdSessions.length,
      questionCount:   questions.length,
      batchId,
      sessionIds:      sessionIds.slice(0, 5), // first 5 as sample
    }, 'Test assigned to all batch students');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/institute/batch/:id/results
 * Returns all completed TestSession results for students in a batch.
 * Query: ?exam=&subject=&limit=100
 */
export async function getBatchResults(req, res, next) {
  try {
    const userId  = req.user.userId;
    const batchId = req.params.id;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const batch = institute.batches.id(batchId);
    if (!batch) return notFound(res, 'Batch not found.');

    const { exam, subject, limit = 200, from } = req.query;
    const studentIds = batch.studentIds;

    if (studentIds.length === 0) {
      return ok(res, { results: [], batch: { _id: batch._id, name: batch.name } });
    }

    const sessionFilter = {
      userId: { $in: studentIds },
      status: 'completed',
      ...(exam    ? { exam }    : {}),
      ...(subject ? { subject } : {}),
      ...(from    ? { completedAt: { $gte: new Date(from) } } : {}),
    };

    const sessions = await TestSession.find(sessionFilter)
      .sort({ accuracy: -1, timeTaken: 1 }) // high accuracy first; faster time as tiebreaker
      .limit(Number(limit))
      .select('userId exam subject accuracy score correctCount totalQuestions timeTaken completedAt')
      .lean();

    // Populate student names
    const userMap = new Map();
    const users = await User.find({ _id: { $in: studentIds } })
      .select('name email profilePic')
      .lean();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    // Build result rows with rank + flags
    const rows = sessions.map((s, idx) => ({
      ...s,
      student:     userMap.get(s.userId.toString()) ?? { name: 'Unknown' },
      rank:        idx + 1,
      belowAvgFlag: s.accuracy < 40,
    }));

    // Class-level stats
    const classAvg = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length)
      : 0;

    return ok(res, {
      results: rows,
      batch:   { _id: batch._id, name: batch.name, exam: batch.exam },
      classStats: {
        totalStudents:  studentIds.length,
        attempted:      rows.length,
        classAvg,
        topper:         rows[0] ?? null,
        belowThreshold: rows.filter((r) => r.accuracy < 40).length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/institute/report
 * Returns comprehensive JSON report data suitable for PDF/Excel export.
 * Query: ?batchId=&from=&to=
 */
export async function generateReport(req, res, next) {
  try {
    const userId = req.user.userId;
    const { batchId, from, to } = req.query;
    const institute = await findMyInstitute(userId);
    if (!institute) return notFound(res, 'Institute not found.');

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    // Determine scope — single batch or entire institute
    const studentIds = batchId
      ? (institute.batches.id(batchId)?.studentIds ?? [])
      : institute.students;

    const batchInfo = batchId ? institute.batches.id(batchId) : null;

    if (studentIds.length === 0) {
      return ok(res, { reportData: null, message: 'No students in scope' });
    }

    const sessionFilter = {
      userId: { $in: studentIds },
      status: 'completed',
      ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}),
    };

    const [sessions, students] = await Promise.all([
      TestSession.find(sessionFilter)
        .select('userId exam subject accuracy score correctCount totalQuestions timeTaken completedAt')
        .lean(),
      User.find({ _id: { $in: studentIds } }).select('name email').lean(),
    ]);

    const studentMap = new Map(students.map((u) => [u._id.toString(), u]));

    // Per-student aggregation
    const perStudent = {};
    for (const s of sessions) {
      const uid = s.userId.toString();
      if (!perStudent[uid]) {
        perStudent[uid] = {
          student:    studentMap.get(uid) ?? { name: 'Unknown' },
          tests:      0,
          totalAcc:   0,
          avgAccuracy: 0,
          subjects:   {},
        };
      }
      perStudent[uid].tests++;
      perStudent[uid].totalAcc += s.accuracy;
      const subj = s.subject || 'Unknown';
      if (!perStudent[uid].subjects[subj]) perStudent[uid].subjects[subj] = [];
      perStudent[uid].subjects[subj].push(s.accuracy);
    }

    const studentRows = Object.values(perStudent).map((p) => ({
      ...p,
      avgAccuracy: p.tests > 0 ? Math.round(p.totalAcc / p.tests) : 0,
      subjectBreakdown: Object.entries(p.subjects).map(([subj, scores]) => ({
        subject: subj,
        attempts: scores.length,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      })),
      totalAcc: undefined,
      subjects: undefined,
    })).sort((a, b) => b.avgAccuracy - a.avgAccuracy);

    // Overall stats
    const avgAccuracy = studentRows.length
      ? Math.round(studentRows.reduce((s, r) => s + r.avgAccuracy, 0) / studentRows.length)
      : 0;

    return ok(res, {
      reportData: {
        generatedAt: new Date().toISOString(),
        institute: {
          name:       institute.name,
          logo:       institute.logo,
          brandColor: institute.brandColor,
        },
        scope: batchInfo ? { type: 'batch', name: batchInfo.name, exam: batchInfo.exam } : { type: 'institute' },
        dateRange: { from: from || null, to: to || null },
        summary: {
          totalStudents: students.length,
          totalTests:    sessions.length,
          avgAccuracy,
          topperName:    studentRows[0]?.student?.name ?? '-',
          topperScore:   studentRows[0]?.avgAccuracy ?? 0,
          below40Pct:    studentRows.filter((r) => r.avgAccuracy < 40).length,
        },
        studentRows,
      },
    });
  } catch (err) {
    next(err);
  }
}
