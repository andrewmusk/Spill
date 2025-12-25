import { Router } from 'express';
import { feedController } from '../controllers/feed.controller.js';
import { requireAuthentication } from '../http/middleware/auth.middleware.js';

const router = Router();

// Placeholder routes - to be implemented
// Routes wire HTTP → controller only, apply middleware, no business logic

export { router as feedRoutes };

