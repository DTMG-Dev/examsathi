import './env.js'; // Must be first — loads .env with override before any module reads process.env
import mongoose from 'mongoose';
import app from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

/**
 * Validates that all required environment variables are set.
 * Exits the process immediately if any are missing.
 */
function validateEnv() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ANTHROPIC_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Copy .env.example to .env and fill in all values.');
    process.exit(1);
  }
}

/**
 * Connects to MongoDB and starts the Express server.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 */
async function startServer() {
  validateEnv();

  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB successfully');

    const server = app.listen(config.port, () => {
      logger.info(
        `ExamSathi server running on port ${config.port} [${config.nodeEnv}]`,
      );
    });

    /**
     * Gracefully shuts down the server and closes the DB connection.
     * @param {string} signal
     */
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
