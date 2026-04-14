import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { AiCache } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

const MODEL = config.anthropic.model;
const MAX_RETRIES = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a SHA-256 hex digest of the function name + serialised params.
 * Same inputs → same hash → cache hit.
 */
function hashPrompt(fnName, params) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ fnName, ...params }))
    .digest('hex');
}

/**
 * Extracts a JSON value from a string that may contain extra text.
 * Claude occasionally adds a preamble even when asked not to.
 * Tries: direct parse → JSON array extraction → JSON object extraction.
 */
function extractJSON(text) {
  try {
    return JSON.parse(text.trim());
  } catch { /* fall through */ }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* continue */ }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try { return JSON.parse(objectMatch[0]); } catch { /* continue */ }
  }

  throw new Error('No valid JSON found in Claude response');
}

/**
 * Core helper:
 *   hash → AiCache check → Claude API (with exponential retry) → parse JSON → cache write → return
 *
 * @param {string} prompt     - Full prompt string for Claude
 * @param {string} fnName     - Cache-keyed function name
 * @param {object} params     - Original params (for hash + exam metadata)
 * @param {number} maxTokens  - Max tokens for the response
 */
async function callClaude(prompt, fnName, params, maxTokens = 20000) {
  const promptHash = hashPrompt(fnName, params);

  // ── 1. Cache lookup ────────────────────────────────────────────────────────
  const cached = await AiCache.findOne({ promptHash }).lean();
  if (cached) {
    logger.info(`[ClaudeService] Cache HIT — ${fnName} (hash: ${promptHash.slice(0, 8)})`);
    return cached.response;
  }

  // ── 2. API call with exponential backoff (2s → 4s → 8s) ──────────────────
  let rawText;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(
        `[ClaudeService] Calling Claude — ${fnName}, attempt ${attempt}/${MAX_RETRIES}`,
      );
      const message = await anthropic.messages.create({
        model:       MODEL,
        max_tokens:  maxTokens,
        temperature: 1,
        thinking:    { type: 'disabled' },
        messages:    [{ role: 'user', content: prompt }],
      });
      rawText = message.content[0]?.text ?? '';
      break;
    } catch (err) {
      logger.error(
        `[ClaudeService] Attempt ${attempt} failed — ${fnName}: ${err.message}`,
      );
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  logger.info(`[ClaudeService] Response received — ${fnName} (${rawText.length} chars)`);

  // ── 3. Parse JSON response ─────────────────────────────────────────────────
  const parsed = extractJSON(rawText);

  // ── 4. Cache write (fire & forget — never block the caller) ───────────────
  AiCache.create({
    promptHash,
    response: parsed,
    fnName,
    exam: params.exam ?? undefined,
    model: MODEL,
  }).catch((err) =>
    logger.warn(`[ClaudeService] Cache write failed — ${fnName}: ${err.message}`),
  );

  return parsed;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates multiple-choice questions for a given exam / subject / topic.
 *
 * @param {{ exam, subject, topic, difficulty, count, language }} params
 * @returns {Promise<Array>} Array of question objects
 */
export async function generateMCQs({
  exam,
  subject,
  topic,
  difficulty,
  count = 10,
  language = 'en',
}) {
  const prompt = `You are an expert ${exam} exam coach in India with 15+ years experience.
Generate ${count} high-quality MCQs on "${topic}" from ${subject} for ${exam} exam at ${difficulty} level.
Language: ${language === 'hi' ? 'Hindi' : 'English'}

Each question must:
- Match actual ${exam} exam pattern and difficulty
- Have exactly 4 options (A, B, C, D)
- Have one definitively correct answer
- Include a clear 150-word explanation
- Mention why other options are wrong

Return ONLY a valid JSON array, no other text:
[{
  "questionText": "",
  "options": [
    {"id": "A", "text": ""},
    {"id": "B", "text": ""},
    {"id": "C", "text": ""},
    {"id": "D", "text": ""}
  ],
  "correctAnswer": "A",
  "explanation": "",
  "tags": []
}]`;

  return callClaude(
    prompt,
    'generateMCQs',
    { exam, subject, topic, difficulty, count, language },
    20000,
  );
}

/**
 * Generates a personalised week-by-week study roadmap.
 * Prompt follows the structured strategist format with per-topic targetDates.
 *
 * @param {{ exam, examDate, dailyHours, weakAreas, daysRemaining }} params
 * @returns {Promise<object>} Roadmap object
 */
export async function generateStudyRoadmap({
  exam,
  examDate,
  dailyHours,
  weakAreas = [],
  daysRemaining = 90,
}) {
  const prompt = `You are an expert ${exam} exam strategist with 15+ years experience coaching Indian students.

Student Profile:
- Exam: ${exam}
- Exam Date: ${examDate}
- Daily Study Hours: ${dailyHours}
- Weak Areas: ${weakAreas.length ? weakAreas.join(', ') : 'None identified yet'}
- Days Remaining: ${daysRemaining}

Create a detailed week-by-week study roadmap. Rules:
1. Prioritize weak areas in the first 60% of the plan
2. Balance all subjects every week — never skip a subject for more than 2 weeks
3. Reserve the final 2 weeks strictly for revision and mock tests
4. Each topic's targetDate must fall within its week (Mon–Sun)
5. Limit topics per week so total hours ≤ dailyHours × 7

Return ONLY valid JSON, no other text:
{
  "totalWeeks": 12,
  "strategy": "brief 2-sentence overall strategy",
  "weeks": [{
    "weekNumber": 1,
    "theme": "Foundation - Biology Basics",
    "topics": [{
      "subject": "Biology",
      "topic": "Cell Structure",
      "subtopic": "Cell Organelles",
      "estimatedHours": 3,
      "targetDate": "2025-05-10",
      "priority": "high",
      "resources": ["NCERT Ch 8", "Previous Year 2023"]
    }]
  }]
}`;

  return callClaude(
    prompt,
    'generateStudyRoadmap',
    { exam, examDate, dailyHours, daysRemaining,
      weakAreasDigest: hashPrompt('wa', weakAreas) },
    20000,
  );
}

/**
 * Analyses test results and returns weak area insights with recommendations.
 *
 * @param {{ testResults, exam }} params
 * @returns {Promise<object>} Analysis object
 */
export async function analyzeWeakAreas({ testResults, exam }) {
  const prompt = `You are an expert ${exam} exam coach analysing student performance data.

Exam: ${exam}
Test Results:
${JSON.stringify(testResults, null, 2)}

Identify weak areas and provide actionable, prioritised recommendations.

Return ONLY a valid JSON object, no other text:
{
  "overallAccuracy": 0,
  "strengths": [{"subject": "", "topics": [], "accuracy": 0}],
  "weaknesses": [
    {
      "subject": "",
      "topic": "",
      "accuracy": 0,
      "priority": "critical",
      "recommendation": "",
      "suggestedHoursPerWeek": 0,
      "resources": []
    }
  ],
  "studyPriority": [],
  "predictedScore": 0,
  "improvementTips": []
}`;

  // Hash a short digest of results instead of the full object for cache key stability
  const resultsDigest = crypto
    .createHash('sha256')
    .update(JSON.stringify(testResults))
    .digest('hex')
    .slice(0, 16);

  return callClaude(prompt, 'analyzeWeakAreas', { exam, resultsDigest }, 4096);
}

/**
 * Provides a step-by-step doubt resolution for a student's question.
 *
 * @param {{ question, exam, subject, language }} params
 * @returns {Promise<object>} Solution object
 */
export async function solveDoubt({ question, exam, subject, language = 'en' }) {
  const prompt = `You are an expert ${exam} teacher in India specialising in ${subject}.
Language: ${language === 'hi' ? 'Hindi' : 'English'}

Student's doubt: ${question}

Provide a clear, step-by-step solution appropriate for ${exam} exam preparation.

Return ONLY a valid JSON object, no other text:
{
  "solution": "",
  "steps": [
    {"step": 1, "title": "", "content": "", "formula": ""}
  ],
  "keyPoints": [],
  "relatedConcepts": [],
  "examTip": "",
  "difficulty": "easy"
}`;

  return callClaude(
    prompt,
    'solveDoubt',
    { question, exam, subject, language },
    2048,
  );
}

/**
 * Generates targeted spaced-repetition review questions for a user's weak areas.
 *
 * @param {{ weakAreas, userId }} params
 * @returns {Promise<Array>} Array of weak-area + targeted questions
 */
export async function generateSpacedRepetitionQuestions({ weakAreas, userId }) {
  const topAreas = weakAreas.slice(0, 5);

  const prompt = `You are an expert exam coach using spaced repetition to help students master weak topics.

Weak areas to target:
${topAreas
  .map(
    (a) =>
      `- ${a.exam} | ${a.subject} | ${a.topic} (accuracy: ${a.accuracy}%, priority: ${a.priority})`,
  )
  .join('\n')}

Generate 2-3 targeted review questions per weak area. Questions should:
- Start with foundational concepts and build to higher complexity
- Reinforce core memory anchors
- Include why wrong answers are commonly chosen

Return ONLY a valid JSON array, no other text:
[{
  "exam": "",
  "subject": "",
  "topic": "",
  "priority": "critical",
  "questions": [{
    "questionText": "",
    "options": [
      {"id": "A", "text": ""},
      {"id": "B", "text": ""},
      {"id": "C", "text": ""},
      {"id": "D", "text": ""}
    ],
    "correctAnswer": "A",
    "explanation": "",
    "memoryAnchor": "",
    "tags": []
  }]
}]`;

  const areasDigest = crypto
    .createHash('sha256')
    .update(JSON.stringify(topAreas))
    .digest('hex')
    .slice(0, 16);

  return callClaude(
    prompt,
    'generateSpacedRepetitionQuestions',
    { areasDigest, userId: userId?.toString() },
    20000,
  );
}
