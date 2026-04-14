/**
 * Environment initialisation — must be the first import in server.js and app.js.
 *
 * `override: true` ensures .env file values always win over any system-level
 * environment variables (including ones set to empty string "").
 *
 * This file is a side-effect module: importing it calls dotenv.config() immediately
 * during the ES module link phase, before any other module reads process.env.
 */
import { config } from 'dotenv';
config({ override: true });
