import { z } from 'zod';

// Request Schemas

// GET /api/users/:handle
export const GetUserByHandleParamsSchema = z.object({
  handle: z.string().min(1),
});

export type GetUserByHandleParams = z.infer<typeof GetUserByHandleParamsSchema>;

// GET /api/users?q=...&limit=...&cursor=...
export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  cursor: z.string().optional(),
});

export type SearchUsersQuery = z.infer<typeof SearchUsersQuerySchema>;

// Response Schemas

export const UserStatsSchema = z.object({
  followers: z.number(),
  following: z.number(),
  polls: z.number(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string().nullable(),
  isPrivate: z.boolean(),
  createdAt: z.date().or(z.string()),
  stats: UserStatsSchema,
});

export const GetUserByHandleResponseSchema = z.object({
  data: z.object({
    user: UserProfileSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const SearchUsersResponseSchema = z.object({
  data: z.object({
    users: z.array(
      z.object({
        id: z.string(),
        handle: z.string(),
        displayName: z.string().nullable(),
        isPrivate: z.boolean(),
        createdAt: z.date().or(z.string()),
      })
    ),
  }),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    traceId: z.string().optional(),
  }),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type GetUserByHandleResponse = z.infer<typeof GetUserByHandleResponseSchema>;
export type SearchUsersResponse = z.infer<typeof SearchUsersResponseSchema>;

