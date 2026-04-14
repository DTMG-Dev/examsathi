import { User, TestSession, WeakArea } from '../models/index.js';

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

/** Verify that childId is linked to parentId. Returns the child doc or null. */
async function verifyChild(childId, parentId) {
  return User.findOne({ _id: childId, parentId });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/parent/link-child
 * Body: { email }
 * Links a student account to the authenticated parent by the student's email.
 */
export async function linkChild(req, res, next) {
  try {
    const parentId = req.user.userId;
    const { email } = req.body;

    if (!email) return badRequest(res, 'Student email is required.');

    const student = await User.findOne({ email: email.toLowerCase(), role: 'student' });
    if (!student) return notFound(res, 'No student account found with that email.');

    if (student.parentId && student.parentId.toString() !== parentId) {
      return badRequest(res, 'This student is already linked to another parent account.');
    }

    await User.findByIdAndUpdate(student._id, { parentId });
    // Ensure caller has parent role
    await User.findByIdAndUpdate(parentId, { role: 'parent' });

    return ok(res, {
      child: {
        _id:        student._id,
        name:       student.name,
        email:      student.email,
        targetExam: student.targetExam ?? null,
        profilePic: student.profilePic ?? null,
      },
    }, 'Child linked successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children
 * Returns all student accounts linked to the authenticated parent.
 */
export async function getMyChildren(req, res, next) {
  try {
    const parentId = req.user.userId;
    const children = await User.find({ parentId, role: 'student' }).select(
      'name email targetExam examDate profilePic streak',
    );

    return ok(res, {
      children: children.map((c) => ({
        _id:        c._id,
        name:       c.name,
        email:      c.email,
        targetExam: c.targetExam ?? null,
        examDate:   c.examDate ?? null,
        profilePic: c.profilePic ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/child/:id/progress
 * Full 30-day progress summary for a linked child.
 */
export async function getChildProgress(req, res, next) {
  try {
    const parentId = req.user.userId;
    const { id: childId } = req.params;

    const child = await verifyChild(childId, parentId);
    if (!child) return notFound(res, 'Child not found or not linked to your account.');

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // All completed sessions in the last 30 days (ascending for trend ordering)
    const sessions = await TestSession.find({
      userId:      childId,
      status:      'completed',
      completedAt: { $gte: thirtyDaysAgo },
    }).sort({ completedAt: 1 });

    const recentSessions = sessions.filter((s) => s.completedAt >= sevenDaysAgo);

    // ── Score Trend (daily average accuracy, last 30 days) ─────────────────
    const trendMap = new Map();
    for (const s of sessions) {
      const date = s.completedAt.toISOString().slice(0, 10);
      if (!trendMap.has(date)) trendMap.set(date, { sum: 0, count: 0, subject: s.subject });
      const entry = trendMap.get(date);
      entry.sum   += s.accuracy;
      entry.count += 1;
    }
    const scoreTrend = [...trendMap.entries()].map(([date, v]) => ({
      date,
      accuracy: Math.round(v.sum / v.count),
      subject:  v.subject,
    }));

    // ── Subject-wise performance ───────────────────────────────────────────
    const subjectMap = new Map();
    for (const s of sessions) {
      if (!subjectMap.has(s.subject)) subjectMap.set(s.subject, { sum: 0, count: 0 });
      const e = subjectMap.get(s.subject);
      e.sum   += s.accuracy;
      e.count += 1;
    }
    const subjectPerformance = [...subjectMap.entries()].map(([subject, v]) => ({
      subject,
      accuracy: Math.round(v.sum / v.count),
      tests:    v.count,
    })).sort((a, b) => b.tests - a.tests);

    // ── Daily study time (last 7 days, in minutes from session timeTaken) ─
    const dailyMinutes = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dailyMinutes[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of recentSessions) {
      const key = s.completedAt.toISOString().slice(0, 10);
      if (key in dailyMinutes) dailyMinutes[key] += Math.round(s.timeTaken / 60);
    }
    const dailyStudyTime = Object.entries(dailyMinutes).map(([date, minutes]) => ({ date, minutes }));

    // ── Study heatmap: session count by hour of day ────────────────────────
    const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const s of sessions) {
      const h = new Date(s.completedAt).getHours();
      hourCounts[h].count += 1;
    }

    // ── Summary metrics ────────────────────────────────────────────────────
    const testsThisWeek = recentSessions.length;
    const avgScore      = sessions.length
      ? Math.round(sessions.reduce((a, b) => a + b.accuracy, 0) / sessions.length)
      : 0;

    // Readiness score: streak (max 20) + avg accuracy weighted (max 70) + activity (max 10)
    const streakBonus   = Math.min(child.streak.current * 2, 20);
    const accuracyScore = Math.round(Math.min(avgScore * 0.7, 70));
    const activityScore = Math.round(Math.min(testsThisWeek * 1.25, 10));
    const readinessScore = streakBonus + accuracyScore + activityScore;

    // ── Smart Alerts ───────────────────────────────────────────────────────
    const alerts = [];

    const lastStudied  = child.streak.lastStudied;
    const daysSince    = lastStudied
      ? Math.floor((now - new Date(lastStudied)) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSince !== null && daysSince >= 2) {
      alerts.push({
        type:    'warning',
        message: `${child.name} hasn't studied in ${daysSince} day${daysSince !== 1 ? 's' : ''}`,
      });
    }

    for (const sp of subjectPerformance) {
      if (sp.accuracy < 50) {
        alerts.push({ type: 'warning', message: `Weak in ${sp.subject} — needs attention (${sp.accuracy}%)` });
      }
    }

    if (sessions.length >= 6) {
      const half   = Math.floor(sessions.length / 2);
      const oldAvg = Math.round(sessions.slice(0, half).reduce((a, b) => a + b.accuracy, 0) / half);
      const newAvg = Math.round(sessions.slice(half).reduce((a, b) => a + b.accuracy, 0) / (sessions.length - half));
      const improvement = newAvg - oldAvg;
      if (improvement >= 10) {
        const topSubject = [...subjectPerformance].sort((a, b) => b.accuracy - a.accuracy)[0]?.subject;
        if (topSubject) {
          alerts.push({ type: 'success', message: `Improved ${improvement}% in ${topSubject} this week 🎉` });
        }
      }
    }

    if (child.streak.current >= 7) {
      alerts.push({ type: 'info', message: `${child.name} has a ${child.streak.current}-day study streak! 🔥` });
    }

    if (!alerts.length && testsThisWeek === 0) {
      alerts.push({ type: 'info', message: 'No tests taken this week. Encourage a daily practice session.' });
    }

    return ok(res, {
      child: {
        _id:        child._id,
        name:       child.name,
        email:      child.email,
        profilePic: child.profilePic ?? null,
        targetExam: child.targetExam ?? null,
        examDate:   child.examDate ?? null,
        streak:     child.streak,
      },
      summary: { studyStreak: child.streak.current, testsThisWeek, avgScore, readinessScore },
      scoreTrend,
      subjectPerformance,
      dailyStudyTime,
      studyHeatmap: hourCounts,
      alerts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/child/:id/weekly-report
 * 7-day summary with comparison to the previous week.
 */
export async function getWeeklyReport(req, res, next) {
  try {
    const parentId = req.user.userId;
    const { id: childId } = req.params;

    const child = await verifyChild(childId, parentId);
    if (!child) return notFound(res, 'Child not found or not linked to your account.');

    const now           = new Date();
    const sevenDaysAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenAgo   = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeek] = await Promise.all([
      TestSession.find({ userId: childId, status: 'completed', completedAt: { $gte: sevenDaysAgo } }),
      TestSession.find({ userId: childId, status: 'completed', completedAt: { $gte: fourteenAgo, $lt: sevenDaysAgo } }),
    ]);

    const avgThis = thisWeek.length
      ? Math.round(thisWeek.reduce((a, b) => a + b.accuracy, 0) / thisWeek.length)
      : 0;
    const avgLast = lastWeek.length
      ? Math.round(lastWeek.reduce((a, b) => a + b.accuracy, 0) / lastWeek.length)
      : 0;

    const subjectMap = new Map();
    for (const s of thisWeek) {
      if (!subjectMap.has(s.subject)) subjectMap.set(s.subject, { sum: 0, count: 0 });
      const e = subjectMap.get(s.subject);
      e.sum   += s.accuracy;
      e.count += 1;
    }
    const subjectEntries = [...subjectMap.entries()]
      .map(([sub, v]) => ({ subject: sub, avg: Math.round(v.sum / v.count) }))
      .sort((a, b) => b.avg - a.avg);

    const topSubject     = subjectEntries[0]?.subject ?? '—';
    const weakestSubject = subjectEntries[subjectEntries.length - 1]?.subject ?? '—';
    const totalScore     = thisWeek.reduce((a, b) => a + b.score, 0);
    const improvement    = avgThis - avgLast;

    const recommendations = [];
    if (improvement < 0) {
      recommendations.push(`Scores dipped ${Math.abs(improvement)}% vs last week — revisit ${weakestSubject}.`);
    }
    if (thisWeek.length < 3) {
      recommendations.push('Encourage at least one practice test per day for consistent improvement.');
    }
    if (child.streak.current === 0) {
      recommendations.push('Help establish a daily study routine — even 30 minutes daily compounds over time.');
    }
    if (subjectEntries.some((s) => s.avg < 50)) {
      recommendations.push(`${weakestSubject} needs extra attention — consider additional coaching or revision.`);
    }
    if (improvement >= 10) {
      recommendations.push(`Great momentum in ${topSubject}! Keep it going with timed mock tests.`);
    }
    if (!recommendations.length) {
      recommendations.push('Consistent performance this week! Focus on timed mock tests for exam readiness.');
    }

    return ok(res, {
      week:           sevenDaysAgo.toISOString().slice(0, 10),
      testsTaken:     thisWeek.length,
      totalScore,
      avgAccuracy:    avgThis,
      improvement,
      topSubject,
      weakestSubject,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/child/:id/weak-areas
 * Weak topic list for a linked child, sorted by accuracy ascending.
 */
export async function getChildWeakAreas(req, res, next) {
  try {
    const parentId = req.user.userId;
    const { id: childId } = req.params;

    const child = await verifyChild(childId, parentId);
    if (!child) return notFound(res, 'Child not found or not linked to your account.');

    const weakAreas = await WeakArea.find({ userId: childId, isMastered: false })
      .sort({ accuracy: 1 })
      .limit(15);

    return ok(res, {
      weakAreas: weakAreas.map((w) => ({
        subject:      w.subject,
        topic:        w.topic,
        accuracy:     w.accuracy,
        attempts:     w.totalAttempts,
        priority:     w.priority,
        lastAttempted: w.lastAttempted ?? w.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
