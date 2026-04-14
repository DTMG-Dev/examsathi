/**
 * Barrel export for all Mongoose models.
 * Import from here to keep import paths clean:
 *   import { User, Question, TestSession } from '../models/index.js';
 */

export { default as User } from './User.model.js';
export { default as Question } from './Question.model.js';
export { default as TestSession } from './TestSession.model.js';
export { default as StudyRoadmap } from './StudyRoadmap.model.js';
export { default as StudyGroup } from './StudyGroup.model.js';
export { default as Institute } from './Institute.model.js';
export { default as WeakArea } from './WeakArea.model.js';
export { default as AiCache } from './AiCache.model.js';
export { default as Plan } from './Plan.model.js';
