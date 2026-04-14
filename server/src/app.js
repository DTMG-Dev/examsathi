import './env.js'; // Must be first — loads .env with override before any module reads process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';

const app = express();

// ─── Trust proxy (required for Railway deployment) ────────────────────────────
app.set('trust proxy', 1);

// ─── Security headers via Helmet ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// ─── CORS — whitelist frontend domain only ────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [config.client.url];
      // Allow server-to-server calls (no origin) in development only
      if (!origin && !config.isProduction) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Reauth-Token'],
  }),
);

// ─── Response compression (gzip) — optimised for 3G Indian networks ──────────
app.use(compression());

// ─── Request logging via Morgan → Winston ────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: (req) => req.url === '/health',
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Sanitise inputs — prevent MongoDB operator injection ─────────────────────
app.use(mongoSanitize());

// ─── Global rate limit: 100 req / 15 min ─────────────────────────────────────
app.use(globalLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: config.nodeEnv,
    },
    message: 'ExamSathi API is running',
  });
});

// ─── Feature routes ───────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import questionRoutes from './routes/questions.routes.js';
import testRoutes from './routes/test.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import roadmapRoutes from './routes/roadmap.routes.js';
import weakAreaRoutes from './routes/weakArea.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import groupRoutes from './routes/groups.routes.js';
import instituteRoutes from './routes/institute.routes.js';
import parentRoutes from './routes/parent.routes.js';
// import userRoutes from './routes/user.routes.js';
// import testRoutes from './routes/test.routes.js';
// import resultRoutes from './routes/result.routes.js';
// import roadmapRoutes from './routes/roadmap.routes.js';
// import paymentRoutes from './routes/payment.routes.js';
// import studyGroupRoutes from './routes/studyGroup.routes.js';
// import instituteRoutes from './routes/institute.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/weak-areas', weakAreaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/parent', parentRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/tests', testRoutes);
// app.use('/api/results', resultRoutes);
// app.use('/api/roadmap', roadmapRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/study-groups', studyGroupRoutes);
// app.use('/api/institute', instituteRoutes);

// ─── 404 + global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
