import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuthentication, optionalAuthentication } from '../http/middleware/auth.middleware.js';

const router = Router();

// Get user by handle (public endpoint with optional auth for privacy checks)
router.get('/:handle', optionalAuthentication(), userController.getUserByHandle.bind(userController));

// Search users (requires authentication)
router.get('/', requireAuthentication(), userController.searchUsers.bind(userController));

export { router as userRoutes };

