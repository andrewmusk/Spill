import { z } from 'zod';

// Enums
export const PollVisibilitySchema = z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE_LINK']);
export const SelectionTypeSchema = z.enum(['SINGLE', 'MULTIPLE']);

// Request Schemas

// POST /api/polls
export const CreatePollBodySchema = z.object({
  question: z.string().min(1).max(500),
  isContinuous: z.boolean(),
  selectionType: SelectionTypeSchema.optional(),
  maxSelections: z.number().int().positive().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  step: z.number().positive().optional(),
  visibility: PollVisibilitySchema.default('PUBLIC'),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1).max(200),
        position: z.number().int().positive(),
      })
    )
    .min(2)
    .max(10)
    .optional(),
});

export type CreatePollBody = z.infer<typeof CreatePollBodySchema>;

// GET /api/polls/:id
export const GetPollParamsSchema = z.object({
  id: z.string().min(1),
});

export type GetPollParams = z.infer<typeof GetPollParamsSchema>;

export const GetPollQuerySchema = z.object({
  privateLinkToken: z.string().optional(),
});

export type GetPollQuery = z.infer<typeof GetPollQuerySchema>;

// GET /api/polls?cursor=...&limit=...
export const ListPollsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  visibility: PollVisibilitySchema.optional(),
});

export type ListPollsQuery = z.infer<typeof ListPollsQuerySchema>;

// PUT /api/polls/:id
export const UpdatePollParamsSchema = z.object({
  id: z.string().min(1),
});

export type UpdatePollParams = z.infer<typeof UpdatePollParamsSchema>;

export const UpdatePollBodySchema = z.object({
  question: z.string().min(1).max(500).optional(),
  visibility: PollVisibilitySchema.optional(),
  expiresAt: z.string().datetime().optional().nullable().transform((val) => (val ? new Date(val) : null)),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
});

export type UpdatePollBody = z.infer<typeof UpdatePollBodySchema>;

// DELETE /api/polls/:id
export const DeletePollParamsSchema = z.object({
  id: z.string().min(1),
});

export type DeletePollParams = z.infer<typeof DeletePollParamsSchema>;

// Response Schemas

export const PollOptionSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  text: z.string(),
  position: z.number(),
});

export const PollOwnerSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string().nullable(),
});

export const PollCountsSchema = z.object({
  votes: z.number(),
  sliderResponses: z.number(),
});

export const PollSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  question: z.string(),
  isContinuous: z.boolean(),
  selectionType: SelectionTypeSchema.nullable(),
  maxSelections: z.number().int().nullable(),
  minValue: z.number().nullable(),
  maxValue: z.number().nullable(),
  step: z.number().nullable(),
  visibility: PollVisibilitySchema,
  privateLinkToken: z.string().nullable(),
  expiresAt: z.date().or(z.string()).nullable(),
  mediaUrls: z.array(z.string()),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  owner: PollOwnerSchema,
  options: z.array(PollOptionSchema),
  _count: PollCountsSchema,
});

export const CreatePollResponseSchema = z.object({
  data: z.object({
    poll: PollSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const GetPollResponseSchema = z.object({
  data: z.object({
    poll: PollSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const ListPollsResponseSchema = z.object({
  data: z.object({
    polls: z.array(PollSchema),
  }),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    traceId: z.string().optional(),
  }),
});

export const UpdatePollResponseSchema = z.object({
  data: z.object({
    poll: PollSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const DeletePollResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export type Poll = z.infer<typeof PollSchema>;
export type CreatePollResponse = z.infer<typeof CreatePollResponseSchema>;
export type GetPollResponse = z.infer<typeof GetPollResponseSchema>;
export type ListPollsResponse = z.infer<typeof ListPollsResponseSchema>;
export type UpdatePollResponse = z.infer<typeof UpdatePollResponseSchema>;
export type DeletePollResponse = z.infer<typeof DeletePollResponseSchema>;

