import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import {
  GetUserByHandleParamsSchema,
  GetUserByHandleResponseSchema,
  SearchUsersQuerySchema,
  SearchUsersResponseSchema,
} from '../api-contract/users.js';

export class UserController {
  /**
   * GET /api/users/:handle
   */
  async getUserByHandle(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const params = GetUserByHandleParamsSchema.parse(req.params);
      const viewerId = req.user?.id || null;

      // Call service
      const result = await userService.getUserByHandle(params.handle, viewerId);

      // Validate and format response
      const response = GetUserByHandleResponseSchema.parse({
        data: result,
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users?q=...&limit=...&cursor=...
   */
  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const query = SearchUsersQuerySchema.parse(req.query);

      // Call service
      const result = await userService.searchUsers(query.q, query.limit || 20, query.cursor);

      // Validate and format response
      const response = SearchUsersResponseSchema.parse({
        data: result.data,
        meta: {
          nextCursor: result.meta.nextCursor,
          traceId: req.headers['x-request-id'],
        },
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

