import crypto from 'crypto';
import { StudyGroup, User, Question } from '../models/index.js';
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

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char code e.g. "A3F8B21C"
}

/**
 * Recalculate and persist the leaderboard for a group based on challenge scores.
 */
async function rebuildLeaderboard(group) {
  const scoreMap = new Map();

  for (const challenge of group.challenges) {
    for (const p of challenge.participants) {
      const key = p.userId.toString();
      const existing = scoreMap.get(key) ?? { totalScore: 0, challengesCompleted: 0 };
      existing.totalScore += p.score ?? 0;
      if (p.completedAt) existing.challengesCompleted += 1;
      scoreMap.set(key, existing);
    }
  }

  const leaderboard = [...scoreMap.entries()]
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.totalScore - a.totalScore || b.challengesCompleted - a.challengesCompleted)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  group.leaderboard = leaderboard;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/groups
 * Create a new study group. Creator becomes admin.
 * Body: { name, description?, exam, isPublic?, maxMembers? }
 */
export async function createGroup(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, description, exam, isPublic = true, maxMembers = 50 } = req.body;

    if (!name || !exam) {
      return badRequest(res, 'name and exam are required.');
    }

    const inviteCode = generateInviteCode();

    const group = await StudyGroup.create({
      name,
      description,
      exam,
      createdBy: userId,
      isPublic,
      maxMembers: Math.min(maxMembers, 100),
      inviteCode,
      members: [{ userId, role: 'admin', joinedAt: new Date() }],
      lastActivityAt: new Date(),
    });

    logger.info(`Study group created: ${group._id} by user ${userId}`);
    return ok(res, group, 'Study group created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/join
 * Join a group via invite code.
 * Body: { inviteCode }
 */
export async function joinGroup(req, res, next) {
  try {
    const userId = req.user.userId;
    const { inviteCode } = req.body;

    if (!inviteCode) return badRequest(res, 'inviteCode is required.');

    const group = await StudyGroup.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true });
    if (!group) return notFound(res, 'Invalid or expired invite code.');

    // Already a member?
    if (group.members.some((m) => m.userId.toString() === userId)) {
      return badRequest(res, 'You are already a member of this group.');
    }

    if (group.members.length >= group.maxMembers) {
      return badRequest(res, 'This group has reached its maximum member limit.');
    }

    group.members.push({ userId, role: 'member', joinedAt: new Date() });
    group.lastActivityAt = new Date();
    await group.save();

    logger.info(`User ${userId} joined group ${group._id}`);
    return ok(res, { groupId: group._id, name: group.name }, 'Joined group successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/groups
 * Get all groups the current user belongs to, plus public discover groups.
 */
export async function getMyGroups(req, res, next) {
  try {
    const userId = req.user.userId;
    const { discover, exam } = req.query;

    if (discover === 'true') {
      // Public discover section — exclude groups user already belongs to
      const myGroupIds = (
        await StudyGroup.find({ 'members.userId': userId, isActive: true }).select('_id').lean()
      ).map((g) => g._id);

      const filter = {
        isActive: true,
        isPublic: true,
        _id: { $nin: myGroupIds },
        ...(exam ? { exam } : {}),
      };

      const publicGroups = await StudyGroup.find(filter)
        .select('name description exam members maxMembers lastActivityAt inviteCode')
        .sort({ lastActivityAt: -1 })
        .limit(20)
        .lean();

      return ok(res, publicGroups.map((g) => ({
        ...g,
        memberCount: g.members.length,
        members: undefined, // strip member details from discover view
      })));
    }

    // My groups
    const groups = await StudyGroup.find({ 'members.userId': userId, isActive: true })
      .select('name description exam members challenges maxMembers lastActivityAt inviteCode leaderboard')
      .sort({ lastActivityAt: -1 })
      .lean();

    const enriched = groups.map((g) => {
      const myRole = g.members.find((m) => m.userId.toString() === userId)?.role ?? 'member';
      const activeChallenges = g.challenges.filter(
        (c) => c.isActive && new Date(c.dueDate) > new Date(),
      ).length;
      return {
        _id:              g._id,
        name:             g.name,
        description:      g.description,
        exam:             g.exam,
        memberCount:      g.members.length,
        maxMembers:       g.maxMembers,
        activeChallenges,
        lastActivityAt:   g.lastActivityAt,
        inviteCode:       g.inviteCode,
        myRole,
      };
    });

    return ok(res, enriched);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/groups/:id
 * Full group detail: members (with names), challenges, leaderboard.
 */
export async function getGroupDetail(req, res, next) {
  try {
    const userId  = req.user.userId;
    const groupId = req.params.id;

    const group = await StudyGroup.findById(groupId).lean();
    if (!group || !group.isActive) return notFound(res, 'Group not found.');

    // Must be a member (or group is public)
    const isMember = group.members.some((m) => m.userId.toString() === userId);
    if (!isMember && !group.isPublic) return forbidden(res, 'You are not a member of this group.');

    // Populate member names / avatars
    const memberUserIds = group.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: memberUserIds } })
      .select('name email profilePic')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enrichedMembers = group.members.map((m) => ({
      ...m,
      user: userMap.get(m.userId.toString()) ?? null,
    }));

    // Populate leaderboard user names
    const lbUserIds = group.leaderboard.map((l) => l.userId);
    const lbUsers = await User.find({ _id: { $in: lbUserIds } })
      .select('name profilePic')
      .lean();
    const lbUserMap = new Map(lbUsers.map((u) => [u._id.toString(), u]));

    const enrichedLeaderboard = group.leaderboard
      .sort((a, b) => a.rank - b.rank)
      .map((l) => ({
        ...l,
        user: lbUserMap.get(l.userId.toString()) ?? null,
      }));

    const myRole = isMember
      ? group.members.find((m) => m.userId.toString() === userId)?.role
      : null;

    return ok(res, {
      ...group,
      members:     enrichedMembers,
      leaderboard: enrichedLeaderboard,
      isMember,
      myRole,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/:id/challenge
 * Create a challenge inside a group. Must be admin or moderator.
 * Body: { title, description?, topic, subject, difficulty, questionCount?, dueDate }
 */
export async function createChallenge(req, res, next) {
  try {
    const userId  = req.user.userId;
    const groupId = req.params.id;

    const group = await StudyGroup.findById(groupId);
    if (!group || !group.isActive) return notFound(res, 'Group not found.');

    const member = group.members.find((m) => m.userId.toString() === userId);
    if (!member) return forbidden(res, 'You are not a member of this group.');
    if (!['admin', 'moderator'].includes(member.role)) {
      return forbidden(res, 'Only admins and moderators can create challenges.');
    }

    const { title, description, topic, subject, difficulty, questionCount = 10, dueDate } = req.body;
    if (!title || !topic || !subject || !difficulty || !dueDate) {
      return badRequest(res, 'title, topic, subject, difficulty, and dueDate are required.');
    }

    if (new Date(dueDate) <= new Date()) {
      return badRequest(res, 'dueDate must be in the future.');
    }

    const challenge = {
      title,
      description,
      topic,
      subject,
      difficulty,
      questionCount: Math.min(questionCount, 50),
      createdBy: userId,
      dueDate: new Date(dueDate),
      participants: [],
      isActive: true,
    };

    group.challenges.push(challenge);
    group.lastActivityAt = new Date();
    await group.save();

    const newChallenge = group.challenges[group.challenges.length - 1];
    logger.info(`Challenge created in group ${groupId}: ${newChallenge._id}`);
    return ok(res, newChallenge, 'Challenge created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/:id/challenge/:cId/submit
 * Submit results for a challenge. Fetches questions from DB, scores them, updates leaderboard.
 * Body: { answers: [{ questionId, selectedAnswer }], timeTaken }
 */
export async function submitChallenge(req, res, next) {
  try {
    const userId    = req.user.userId;
    const { id: groupId, cId } = req.params;
    const { answers = [], timeTaken = 0 } = req.body;

    const group = await StudyGroup.findById(groupId);
    if (!group || !group.isActive) return notFound(res, 'Group not found.');

    const isMember = group.members.some((m) => m.userId.toString() === userId);
    if (!isMember) return forbidden(res, 'You are not a member of this group.');

    const challenge = group.challenges.id(cId);
    if (!challenge) return notFound(res, 'Challenge not found.');
    if (!challenge.isActive || new Date(challenge.dueDate) < new Date()) {
      return badRequest(res, 'This challenge has expired.');
    }

    // Check if already submitted
    const alreadySubmitted = challenge.participants.some((p) => p.userId.toString() === userId);
    if (alreadySubmitted) return badRequest(res, 'You have already submitted this challenge.');

    // Score the answers
    const questionIds = answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('correctAnswer')
      .lean();
    const correctMap = new Map(questions.map((q) => [q._id.toString(), q.correctAnswer]));

    let correct = 0;
    for (const a of answers) {
      if (correctMap.get(a.questionId) === a.selectedAnswer) correct++;
    }

    const total = answers.length || challenge.questionCount;
    const score = Math.round((correct / total) * 100);
    const accuracy = score;

    // Record participant
    challenge.participants.push({
      userId,
      score,
      accuracy,
      completedAt: new Date(),
      timeTaken:   Math.round(timeTaken),
      rank:        null, // will be assigned by leaderboard rebuild
    });

    // Assign ranks within the challenge (by score desc, then timeTaken asc)
    challenge.participants.sort(
      (a, b) => b.score - a.score || a.timeTaken - b.timeTaken,
    );
    challenge.participants.forEach((p, idx) => { p.rank = idx + 1; });

    // Rebuild group leaderboard
    await rebuildLeaderboard(group);
    group.lastActivityAt = new Date();
    await group.save();

    const myRank = challenge.participants.find((p) => p.userId.toString() === userId)?.rank;

    return ok(res, {
      score,
      accuracy,
      correct,
      total,
      rank: myRank,
      participants: challenge.participants.length,
    }, 'Challenge submitted successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/groups/:id/leaderboard
 * Get the sorted group leaderboard with user names.
 */
export async function getLeaderboard(req, res, next) {
  try {
    const userId  = req.user.userId;
    const groupId = req.params.id;

    const group = await StudyGroup.findById(groupId).lean();
    if (!group || !group.isActive) return notFound(res, 'Group not found.');

    const isMember = group.members.some((m) => m.userId.toString() === userId);
    if (!isMember && !group.isPublic) return forbidden(res, 'Access denied.');

    const userIds = group.leaderboard.map((l) => l.userId);
    const users   = await User.find({ _id: { $in: userIds } })
      .select('name profilePic')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const sorted = [...group.leaderboard]
      .sort((a, b) => a.rank - b.rank)
      .map((l) => ({
        rank:                l.rank,
        totalScore:          l.totalScore,
        challengesCompleted: l.challengesCompleted,
        isMe:                l.userId.toString() === userId,
        user:                userMap.get(l.userId.toString()) ?? null,
      }));

    return ok(res, {
      leaderboard: sorted,
      totalMembers: group.members.length,
    });
  } catch (err) {
    next(err);
  }
}
