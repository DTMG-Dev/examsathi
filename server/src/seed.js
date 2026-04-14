/**
 * ExamSathi — Database Seed Script
 * Run: node src/seed.js
 *
 * Seeds: users, questions (NEET + JEE), subscription plans reference data
 */

import './env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config/index.js';

// ─── Inline minimal models to avoid circular deps ────────────────────────────

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'student' },
  targetExam: String,
  examDate: Date,
  dailyStudyHours: { type: Number, default: 4 },
  streak: { type: Number, default: 0 },
  subscription: {
    plan: { type: String, default: 'free' },
    status: { type: String, default: 'active' },
  },
  createdAt: { type: Date, default: Date.now },
});

const questionSchema = new mongoose.Schema({
  exam: String,
  subject: String,
  topic: String,
  difficulty: String,
  language: { type: String, default: 'en' },
  questionText: String,
  options: { A: String, B: String, C: String, D: String },
  correctAnswer: String,
  explanation: String,
  isPYQ: { type: Boolean, default: false },
  pyqYear: Number,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

// ─── Seed data ────────────────────────────────────────────────────────────────

async function seedUsers() {
  const password = await bcrypt.hash('Test@1234', 12);

  const users = [
    {
      name: 'Arjun Sharma',
      email: 'student@examsathi.in',
      password,
      role: 'student',
      targetExam: 'NEET',
      examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      dailyStudyHours: 6,
      streak: 12,
      subscription: { plan: 'free', status: 'active' },
    },
    {
      name: 'Priya Patel',
      email: 'pro@examsathi.in',
      password,
      role: 'student',
      targetExam: 'JEE',
      examDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      dailyStudyHours: 8,
      streak: 28,
      subscription: { plan: 'pro', status: 'active' },
    },
    {
      name: 'Rajesh Kumar',
      email: 'admin@examsathi.in',
      password,
      role: 'admin',
      targetExam: 'UPSC',
      examDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      dailyStudyHours: 10,
      streak: 45,
      subscription: { plan: 'institute', status: 'active' },
    },
  ];

  await User.deleteMany({ email: { $in: users.map((u) => u.email) } });
  const created = await User.insertMany(users);
  console.log(`✓ Seeded ${created.length} users`);
  return created;
}

async function seedNEETQuestions() {
  const questions = [
    // ── Biology ──────────────────────────────────────────────────────────────
    {
      exam: 'NEET', subject: 'Biology', topic: 'Cell Biology',
      difficulty: 'medium', language: 'en',
      questionText: 'Which organelle is known as the "powerhouse of the cell"?',
      options: { A: 'Nucleus', B: 'Mitochondria', C: 'Ribosome', D: 'Golgi Apparatus' },
      correctAnswer: 'B',
      explanation: 'Mitochondria produce ATP through cellular respiration, earning the title "powerhouse of the cell". They contain their own DNA and ribosomes.',
      tags: ['cell-biology', 'organelles', 'mitochondria'],
    },
    {
      exam: 'NEET', subject: 'Biology', topic: 'Cell Biology',
      difficulty: 'easy', language: 'en',
      questionText: 'The fluid mosaic model of the cell membrane was proposed by',
      options: { A: 'Watson and Crick', B: 'Singer and Nicolson', C: 'Schleiden and Schwann', D: 'Virchow' },
      correctAnswer: 'B',
      explanation: 'Singer and Nicolson proposed the fluid mosaic model in 1972. It describes the membrane as a fluid phospholipid bilayer with embedded proteins.',
      tags: ['cell-membrane', 'fluid-mosaic-model'],
    },
    {
      exam: 'NEET', subject: 'Biology', topic: 'Genetics',
      difficulty: 'hard', language: 'en',
      questionText: 'In a dihybrid cross between AABB and aabb, what fraction of F2 offspring will show both recessive traits?',
      options: { A: '1/16', B: '3/16', C: '9/16', D: '1/4' },
      correctAnswer: 'A',
      explanation: 'In a dihybrid cross (AaBb × AaBb), the ratio is 9:3:3:1. The double recessive (aabb) fraction is 1/16.',
      tags: ['genetics', 'mendelian-genetics', 'dihybrid-cross'],
      isPYQ: true, pyqYear: 2022,
    },
    {
      exam: 'NEET', subject: 'Biology', topic: 'Human Physiology',
      difficulty: 'medium', language: 'en',
      questionText: 'Which part of the nephron is impermeable to water but actively transports salts?',
      options: { A: 'Proximal convoluted tubule', B: 'Loop of Henle descending limb', C: 'Loop of Henle ascending limb', D: 'Collecting duct' },
      correctAnswer: 'C',
      explanation: 'The ascending limb of the loop of Henle is impermeable to water but actively transports NaCl, creating the medullary osmotic gradient.',
      tags: ['excretion', 'nephron', 'kidney'],
      isPYQ: true, pyqYear: 2021,
    },
    // ── Physics ───────────────────────────────────────────────────────────────
    {
      exam: 'NEET', subject: 'Physics', topic: 'Laws of Motion',
      difficulty: 'medium', language: 'en',
      questionText: 'A body of mass 5 kg is acted upon by two perpendicular forces of 8 N and 6 N. The magnitude of acceleration is:',
      options: { A: '1 m/s²', B: '2 m/s²', C: '3 m/s²', D: '4 m/s²' },
      correctAnswer: 'B',
      explanation: 'Net force = √(8² + 6²) = √(64 + 36) = √100 = 10 N. Acceleration = F/m = 10/5 = 2 m/s².',
      tags: ['laws-of-motion', 'newtons-laws', 'vectors'],
    },
    {
      exam: 'NEET', subject: 'Physics', topic: 'Optics',
      difficulty: 'easy', language: 'en',
      questionText: 'The focal length of a concave mirror is 15 cm. Its radius of curvature is:',
      options: { A: '7.5 cm', B: '15 cm', C: '30 cm', D: '45 cm' },
      correctAnswer: 'C',
      explanation: 'For a spherical mirror, R = 2f. Therefore R = 2 × 15 = 30 cm.',
      tags: ['optics', 'mirrors', 'focal-length'],
    },
    // ── Chemistry ─────────────────────────────────────────────────────────────
    {
      exam: 'NEET', subject: 'Chemistry', topic: 'Chemical Bonding',
      difficulty: 'hard', language: 'en',
      questionText: 'The hybridization of nitrogen in N₂O₄ is:',
      options: { A: 'sp', B: 'sp²', C: 'sp³', D: 'sp³d' },
      correctAnswer: 'B',
      explanation: 'In N₂O₄, each nitrogen forms 3 sigma bonds (2 N-O bonds + 1 N-N bond) and has no lone pairs, giving sp² hybridization.',
      tags: ['chemical-bonding', 'hybridization', 'nitrogen-compounds'],
      isPYQ: true, pyqYear: 2023,
    },
    {
      exam: 'NEET', subject: 'Chemistry', topic: 'Electrochemistry',
      difficulty: 'medium', language: 'en',
      questionText: 'The standard cell potential for a Daniell cell (Zn-Cu) at 25°C is approximately:',
      options: { A: '0.34 V', B: '0.76 V', C: '1.10 V', D: '1.46 V' },
      correctAnswer: 'C',
      explanation: 'E°cell = E°cathode − E°anode = +0.34 V (Cu²⁺/Cu) − (−0.76 V) (Zn²⁺/Zn) = 1.10 V.',
      tags: ['electrochemistry', 'cell-potential', 'daniell-cell'],
    },
  ];

  await Question.deleteMany({ exam: 'NEET' });
  const created = await Question.insertMany(questions, { ordered: false });
  console.log(`✓ Seeded ${created.length} NEET questions`);
}

async function seedJEEQuestions() {
  const questions = [
    // ── Mathematics ───────────────────────────────────────────────────────────
    {
      exam: 'JEE', subject: 'Mathematics', topic: 'Calculus',
      difficulty: 'hard', language: 'en',
      questionText: 'The value of ∫₀^π x·sin(x) dx is:',
      options: { A: '0', B: 'π', C: '2π', D: '-π' },
      correctAnswer: 'B',
      explanation: 'Using integration by parts: ∫x·sinx dx = -x·cosx + sinx + C. Evaluating from 0 to π: (-π·(-1) + 0) - (0 + 0) = π.',
      tags: ['integration', 'calculus', 'definite-integrals'],
      isPYQ: true, pyqYear: 2023,
    },
    {
      exam: 'JEE', subject: 'Mathematics', topic: 'Algebra',
      difficulty: 'medium', language: 'en',
      questionText: 'If the sum of the first n terms of an AP is 3n² + 5n, then the 10th term is:',
      options: { A: '55', B: '61', C: '65', D: '71' },
      correctAnswer: 'C',
      explanation: 'Sn = 3n² + 5n. aₙ = Sₙ - Sₙ₋₁ = 6n + 2. For n=10: a₁₀ = 60 + 2 + 3 = 65.',
      tags: ['arithmetic-progression', 'sequences-series'],
    },
    // ── Physics ───────────────────────────────────────────────────────────────
    {
      exam: 'JEE', subject: 'Physics', topic: 'Modern Physics',
      difficulty: 'hard', language: 'en',
      questionText: 'In the Bohr model, the radius of the nth orbit is proportional to:',
      options: { A: 'n', B: 'n²', C: 'n³', D: '1/n' },
      correctAnswer: 'B',
      explanation: 'In the Bohr model, rₙ = n²·a₀ where a₀ = 0.529 Å (Bohr radius). The radius is proportional to n².',
      tags: ['modern-physics', 'bohr-model', 'atomic-structure'],
      isPYQ: true, pyqYear: 2022,
    },
    // ── Chemistry ─────────────────────────────────────────────────────────────
    {
      exam: 'JEE', subject: 'Chemistry', topic: 'Organic Chemistry',
      difficulty: 'medium', language: 'en',
      questionText: 'Which of the following is the most stable carbocation?',
      options: { A: 'CH₃⁺', B: 'CH₃CH₂⁺', C: '(CH₃)₂CH⁺', D: '(CH₃)₃C⁺' },
      correctAnswer: 'D',
      explanation: 'Tertiary carbocations are most stable due to hyperconjugation and inductive effects from three alkyl groups stabilising the positive charge.',
      tags: ['organic-chemistry', 'carbocations', 'stability'],
    },
  ];

  await Question.deleteMany({ exam: 'JEE' });
  const created = await Question.insertMany(questions, { ordered: false });
  console.log(`✓ Seeded ${created.length} JEE questions`);
}

async function seedUPSCQuestions() {
  const questions = [
    {
      exam: 'UPSC', subject: 'History', topic: 'Ancient India',
      difficulty: 'medium', language: 'en',
      questionText: 'The famous rock-cut temples at Ellora were built by which dynasty?',
      options: { A: 'Mauryas', B: 'Guptas', C: 'Rashtrakutas', D: 'Chalukyas' },
      correctAnswer: 'C',
      explanation: 'The Kailasa temple at Ellora (Cave 16) was built by Rashtrakuta king Krishna I in the 8th century CE.',
      tags: ['ancient-india', 'architecture', 'ellora-caves'],
    },
    {
      exam: 'UPSC', subject: 'Polity', topic: 'Constitutional Framework',
      difficulty: 'hard', language: 'en',
      questionText: 'Which article of the Indian Constitution deals with the Right to Constitutional Remedies?',
      options: { A: 'Article 14', B: 'Article 19', C: 'Article 21', D: 'Article 32' },
      correctAnswer: 'D',
      explanation: 'Article 32 provides the Right to Constitutional Remedies, allowing citizens to approach the Supreme Court for enforcement of fundamental rights. Dr. Ambedkar called it the "heart and soul of the Constitution".',
      tags: ['constitutional-law', 'fundamental-rights', 'article-32'],
    },
  ];

  await Question.deleteMany({ exam: 'UPSC' });
  const created = await Question.insertMany(questions, { ordered: false });
  console.log(`✓ Seeded ${created.length} UPSC questions`);
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 ExamSathi Seed Script\n');

  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✓ Connected to MongoDB\n');

    await seedUsers();
    await seedNEETQuestions();
    await seedJEEQuestions();
    await seedUPSCQuestions();

    console.log('\n🎉 Seed complete!\n');
    console.log('Test accounts created:');
    console.log('  student@examsathi.in  / Test@1234  (Free plan, NEET)');
    console.log('  pro@examsathi.in      / Test@1234  (Pro plan, JEE)');
    console.log('  admin@examsathi.in    / Test@1234  (Admin, UPSC)\n');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

main();
