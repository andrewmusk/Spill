import { z } from 'zod';

// Query schemas
export const UserSearchQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  cursor: z.string().optional(),
});

export const PollSearchQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  cursor: z.string().optional(),
});

export const PollResponsesQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  cursor: z.string().optional(),
});

export const ResponseSearchQuerySchema = z.object({
  userId: z.string().optional(),
  pollId: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  cursor: z.string().optional(),
});

// Params schemas
export const UserIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const PollIdParamsSchema = z.object({
  id: z.string().min(1),
});

// Body schemas
export const VisibilitySimulationBodySchema = z.object({
  viewerUserId: z.string().min(1),
  target: z.object({
    type: z.enum(['poll', 'response', 'profile']),
    id: z.string().min(1),
  }),
});

export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
export type PollSearchQuery = z.infer<typeof PollSearchQuerySchema>;
export type PollResponsesQuery = z.infer<typeof PollResponsesQuerySchema>;
export type ResponseSearchQuery = z.infer<typeof ResponseSearchQuerySchema>;
export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
export type PollIdParams = z.infer<typeof PollIdParamsSchema>;
export type VisibilitySimulationBody = z.infer<typeof VisibilitySimulationBodySchema>;
