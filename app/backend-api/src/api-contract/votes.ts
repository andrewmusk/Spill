import { z } from 'zod';

// Request Schemas

// POST /api/polls/:pollId/votes
export const CreateVoteParamsSchema = z.object({
  pollId: z.string().min(1),
});

export type CreateVoteParams = z.infer<typeof CreateVoteParamsSchema>;

export const CreateVoteBodySchema = z.object({
  optionId: z.string().min(1),
});

export type CreateVoteBody = z.infer<typeof CreateVoteBodySchema>;

// DELETE /api/polls/:pollId/votes/:optionId
export const DeleteVoteParamsSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
});

export type DeleteVoteParams = z.infer<typeof DeleteVoteParamsSchema>;

// POST /api/polls/:pollId/responses (for slider responses)
export const CreateSliderResponseParamsSchema = z.object({
  pollId: z.string().min(1),
});

export type CreateSliderResponseParams = z.infer<typeof CreateSliderResponseParamsSchema>;

export const CreateSliderResponseBodySchema = z.object({
  value: z.number(),
});

export type CreateSliderResponseBody = z.infer<typeof CreateSliderResponseBodySchema>;

// PUT /api/votes/:voteId/visibility
export const UpdateVoteVisibilityParamsSchema = z.object({
  voteId: z.string().min(1),
});

export type UpdateVoteVisibilityParams = z.infer<typeof UpdateVoteVisibilityParamsSchema>;

export const UpdateVoteVisibilityBodySchema = z.object({
  isHidden: z.boolean().optional(),
  isSharedPublicly: z.boolean().optional(),
  publicComment: z.string().max(500).nullable().optional(),
});

export type UpdateVoteVisibilityBody = z.infer<typeof UpdateVoteVisibilityBodySchema>;

// PUT /api/responses/:responseId/visibility
export const UpdateSliderResponseVisibilityParamsSchema = z.object({
  responseId: z.string().min(1),
});

export type UpdateSliderResponseVisibilityParams = z.infer<typeof UpdateSliderResponseVisibilityParamsSchema>;

export const UpdateSliderResponseVisibilityBodySchema = z.object({
  isHidden: z.boolean().optional(),
  isSharedPublicly: z.boolean().optional(),
  publicComment: z.string().max(500).nullable().optional(),
});

export type UpdateSliderResponseVisibilityBody = z.infer<typeof UpdateSliderResponseVisibilityBodySchema>;

// POST /api/polls/:pollId/skip
export const SkipPollParamsSchema = z.object({
  pollId: z.string().min(1),
});

export type SkipPollParams = z.infer<typeof SkipPollParamsSchema>;

// Response Schemas

export const VoteSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  voterId: z.string(),
  optionId: z.string(),
  isHidden: z.boolean(),
  isSharedPublicly: z.boolean(),
  publicComment: z.string().nullable(),
  flipFlopCount: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const SliderResponseSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  userId: z.string(),
  value: z.number(),
  isHidden: z.boolean(),
  isSharedPublicly: z.boolean(),
  publicComment: z.string().nullable(),
  flipFlopCount: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const CreateVoteResponseSchema = z.object({
  data: z.object({
    vote: VoteSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const DeleteVoteResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const CreateSliderResponseResponseSchema = z.object({
  data: z.object({
    response: SliderResponseSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const UpdateVoteVisibilityResponseSchema = z.object({
  data: z.object({
    vote: VoteSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const UpdateSliderResponseVisibilityResponseSchema = z.object({
  data: z.object({
    response: SliderResponseSchema,
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export const SkipPollResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  meta: z.object({
    traceId: z.string().optional(),
  }),
});

export type Vote = z.infer<typeof VoteSchema>;
export type SliderResponse = z.infer<typeof SliderResponseSchema>;
export type CreateVoteResponse = z.infer<typeof CreateVoteResponseSchema>;
export type DeleteVoteResponse = z.infer<typeof DeleteVoteResponseSchema>;
export type CreateSliderResponseResponse = z.infer<typeof CreateSliderResponseResponseSchema>;
export type UpdateVoteVisibilityResponse = z.infer<typeof UpdateVoteVisibilityResponseSchema>;
export type UpdateSliderResponseVisibilityResponse = z.infer<typeof UpdateSliderResponseVisibilityResponseSchema>;
export type SkipPollResponse = z.infer<typeof SkipPollResponseSchema>;

