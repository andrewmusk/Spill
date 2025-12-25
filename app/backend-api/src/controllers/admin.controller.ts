import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import {
  UserSearchQuerySchema,
  PollSearchQuerySchema,
  PollResponsesQuerySchema,
  ResponseSearchQuerySchema,
  UserIdParamsSchema,
  PollIdParamsSchema,
  VisibilitySimulationBodySchema,
} from '../api-contract/admin.schemas.js';

export class AdminController {
  /**
   * GET /admin/health
   */
  async getHealth(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/db
   */
  async getDbHealth(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/users
   */
  async searchUsers(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/users/:id
   */
  async getUserDetails(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/polls
   */
  async searchPolls(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/polls/:id
   */
  async getPollDetails(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/polls/:id/responses
   */
  async getPollResponses(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * GET /admin/responses
   */
  async searchResponses(req: Request, res: Response, next: NextFunction) {
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
  }

  /**
   * POST /admin/simulate/visibility
   */
  async simulateVisibility(req: Request, res: Response, next: NextFunction) {
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
  }
}

export const adminController = new AdminController();

