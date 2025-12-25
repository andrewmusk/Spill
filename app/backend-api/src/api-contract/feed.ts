import { z } from 'zod';
import { PollVisibilitySchema, PollSchema } from './polls.js';

// Request Schemas

// GET /api/feed?cursor=...&limit=...&visibility=...
export const GetFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  visibility: PollVisibilitySchema.optional(),
});

export type GetFeedQuery = z.infer<typeof GetFeedQuerySchema>;

// GET /api/users/:userId/polls?cursor=...&limit=...
export const GetUserPollsParamsSchema = z.object({
  userId: z.string().min(1),
});

export type GetUserPollsParams = z.infer<typeof GetUserPollsParamsSchema>;

export const GetUserPollsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type GetUserPollsQuery = z.infer<typeof GetUserPollsQuerySchema>;

// Response Schemas

export const FeedPollSchema = PollSchema.extend({
  userVoted: z.boolean().optional(),
  userResponse: z.number().optional(),
});

export const GetFeedResponseSchema = z.object({
  data: z.object({
    polls: z.array(FeedPollSchema),
  }),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    traceId: z.string().optional(),
  }),
});

export const GetUserPollsResponseSchema = z.object({
  data: z.object({
    polls: z.array(PollSchema),
  }),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    traceId: z.string().optional(),
  }),
});

export type FeedPoll = z.infer<typeof FeedPollSchema>;
export type GetFeedResponse = z.infer<typeof GetFeedResponseSchema>;
export type GetUserPollsResponse = z.infer<typeof GetUserPollsResponseSchema>;

