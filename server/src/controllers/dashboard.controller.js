import mongoose from 'mongoose';
import { User, TestSession, WeakArea, StudyRoadmap } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/dashboard
 *
 * Aggregates all data needed to render the student dashboard in a single
 * round-trip. All independent queries run in parallel.
 */
export async function getDashboardData(req, res, next) {
  try {
    const userId = req.user.userId;
    const userOid = new mongoose.Types.ObjectId(userId);

    // Today's date range (midnight → midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [user, testAgg, weakAreas, roadmap, recentTests, srsCount] =
      await Promise.all([
        // User profile
        User.findById(userId)
          .select('name targetExam examDate dailyStudyHours streak subscription profilePic')
          .lean(),

        // Lifetime test stats (aggregate)
        TestSession.aggregate([
          { $match: { userId: userOid, status: 'completed' } },
          {
            $group: {
              _id: null,
              testsTaken: { $sum: 1 },
              avgAccuracy: { $avg: '$accuracy' },
              questionsSolved: { $sum: '$totalQuestions' },
            },
          },
        ]),

        // Top 3 unmastered weak areas sorted by accuracy asc
        WeakArea.find({ userId, isMastered: false })
          .sort({ accuracy: 1 })
          .limit(3)
          .select('subject topic accuracy priority exam nextReviewDate')
          .lean(),

        // Active study roadmap
        StudyRoadmap.findOne({ userId, isActive: true })
          .select('exam examDate overallProgress weeks dailyHours')
          .lean(),

        // Last 5 completed tests
        TestSession.find({ userId, status: 'completed' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('exam subject accuracy correctCount totalQuestions difficulty createdAt timeTaken')
          .lean(),

        // Spaced repetition: weak areas due for review today or overdue
        WeakArea.countDocuments({
          userId,
          isMastered: false,
          nextReviewDate: { $lte: new Date() },
        }),
      ]);

    // ── Today's plan from active roadmap ──────────────────────────────────
    let todaysPlan = { topics: [], completedCount: 0, totalCount: 0 };

    if (roadmap?.weeks?.length) {
      const now = new Date();
      const currentWeek = roadmap.weeks.find((w) => {
        return new Date(w.startDate) <= now && new Date(w.endDate) >= now;
      });

      if (currentWeek?.topics?.length) {
        // Compare date strings (YYYY-MM-DD) to avoid UTC vs IST midnight mismatch
        const todayStr = todayStart.toISOString().slice(0, 10);
        const todaysTopics = currentWeek.topics.filter((t) => {
          return new Date(t.targetDate).toISOString().slice(0, 10) === todayStr;
        });
        todaysPlan = {
          topics: todaysTopics.map((t) => ({
            _id: t._id,
            subject: t.subject,
            topic: t.topic,
            isCompleted: t.isCompleted,
            estimatedHours: t.estimatedHours,
          })),
          completedCount: todaysTopics.filter((t) => t.isCompleted).length,
          totalCount: todaysTopics.length,
        };
      }
    }

    // ── Exam countdown ─────────────────────────────────────────────────────
    let examCountdown = null;
    if (user?.examDate) {
      const msLeft = new Date(user.examDate).getTime() - Date.now();
      const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      examCountdown = {
        daysRemaining,
        readinessPercent: roadmap?.overallProgress ?? 0,
        examDate: user.examDate,
        exam: user.targetExam,
      };
    }

    // ── Stat defaults ──────────────────────────────────────────────────────
    const agg = testAgg[0] ?? { testsTaken: 0, avgAccuracy: 0, questionsSolved: 0 };

    logger.info(`[dashboard.controller] Data fetched — user=${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          name: user?.name ?? 'Student',
          streak: user?.streak ?? { current: 0, longest: 0 },
          targetExam: user?.targetExam,
          profilePic: user?.profilePic,
          subscription: user?.subscription ?? { plan: 'free', isActive: false },
        },
        stats: {
          testsTaken: agg.testsTaken,
          avgAccuracy: Math.round(agg.avgAccuracy ?? 0),
          questionsSolved: agg.questionsSolved,
          studyStreak: user?.streak?.current ?? 0,
        },
        weakAreas,
        todaysPlan,
        recentTests,
        spacedRepetitionCount: srsCount,
        examCountdown,
        // Leaderboard preview requires a study group — returns empty until groups feature built
        leaderboardPreview: { myRank: null, topStudents: [] },
      },
      message: 'Dashboard data fetched successfully',
    });
  } catch (err) {
    next(err);
  }
}
