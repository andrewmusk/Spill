import { Router } from 'express';
import { adminService } from './admin.service.js';
import {
  UserSearchQuerySchema,
  PollSearchQuerySchema,
  PollResponsesQuerySchema,
  ResponseSearchQuerySchema,
  UserIdParamsSchema,
  PollIdParamsSchema,
  VisibilitySimulationBodySchema,
} from './admin.schemas.js';

const router = Router();

// Platform Health
router.get('/health', async (req, res, next) => {
  try {
    const health = await adminService.getHealth();
    res.json({
      data: health,
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/db', async (req, res, next) => {
  try {
    const dbHealth = await adminService.getDbHealth();
    res.json({
      data: dbHealth,
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

// User Search & Inspection
router.get('/users', async (req, res, next) => {
  try {
    const query = UserSearchQuerySchema.parse(req.query);
    const result = await adminService.searchUsers(query.query, query.limit, query.cursor);
    res.json({
      data: result.data,
      meta: {
        nextCursor: result.meta.nextCursor,
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const params = UserIdParamsSchema.parse(req.params);
    const userDetails = await adminService.getUserDetails(params.id);
    res.json({
      data: userDetails,
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Poll Search & Inspection
router.get('/polls', async (req, res, next) => {
  try {
    const query = PollSearchQuerySchema.parse(req.query);
    const result = await adminService.searchPolls(query.query, query.limit, query.cursor);
    res.json({
      data: result.data,
      meta: {
        nextCursor: result.meta.nextCursor,
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/polls/:id', async (req, res, next) => {
  try {
    const params = PollIdParamsSchema.parse(req.params);
    const pollDetails = await adminService.getPollDetails(params.id);
    res.json({
      data: pollDetails,
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/polls/:id/responses', async (req, res, next) => {
  try {
    const params = PollIdParamsSchema.parse(req.params);
    const query = PollResponsesQuerySchema.parse(req.query);
    const result = await adminService.getPollResponses(params.id, query.limit, query.cursor);
    res.json({
      data: result.data,
      meta: {
        nextCursor: result.meta.nextCursor,
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Response Search
router.get('/responses', async (req, res, next) => {
  try {
    const query = ResponseSearchQuerySchema.parse(req.query);
    const result = await adminService.searchResponses(query.userId, query.pollId, query.limit, query.cursor);
    res.json({
      data: result.data,
      meta: {
        nextCursor: result.meta.nextCursor,
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Visibility Simulator
router.post('/simulate/visibility', async (req, res, next) => {
  try {
    const body = VisibilitySimulationBodySchema.parse(req.body);
    const result = await adminService.simulateVisibility(
      body.viewerUserId,
      body.target.type,
      body.target.id
    );
    res.json({
      data: result,
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRoutes };
