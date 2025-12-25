import { Router } from 'express';
import { voteController } from '../controllers/vote.controller.js';
import { requireAuthentication } from '../http/middleware/auth.middleware.js';

const router = Router();

// Placeholder routes - to be implemented
// Routes wire HTTP → controller only, apply middleware, no business logic

export { router as voteRoutes };

