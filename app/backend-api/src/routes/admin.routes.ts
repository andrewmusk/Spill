import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';

const router = Router();

// Platform Health
router.get('/health', adminController.getHealth.bind(adminController));
router.get('/db', adminController.getDbHealth.bind(adminController));

// User Search & Inspection
router.get('/users', adminController.searchUsers.bind(adminController));
router.get('/users/:id', adminController.getUserDetails.bind(adminController));

// Poll Search & Inspection
router.get('/polls', adminController.searchPolls.bind(adminController));
router.get('/polls/:id', adminController.getPollDetails.bind(adminController));
router.get('/polls/:id/responses', adminController.getPollResponses.bind(adminController));

// Response Search
router.get('/responses', adminController.searchResponses.bind(adminController));

// Visibility Simulator
router.post('/simulate/visibility', adminController.simulateVisibility.bind(adminController));

export { router as adminRoutes };

