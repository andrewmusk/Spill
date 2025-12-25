// Shared TypeScript types for admin UI

export interface HealthData {
  ok: boolean;
  service: string;
  version: string;
  commitSha: string;
  env: string;
  now: string;
}

export interface DbHealthData {
  ok: boolean;
  dbHost: string;
  dbName: string;
  migration: {
    latestApplied: string | null;
  };
  counts: {
    users: number;
    polls: number;
    responses: number;
  };
}

export interface User {
  id: string;
  clerkId: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  isPrivate: boolean;
  hideVotesFromFriends: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    polls: number;
    followers: number;
    following: number;
    votes: number;
    sliderResponses: number;
  };
}

export interface UserDetails extends User {
  counts: {
    polls: number;
    votes: number;
    sliderResponses: number;
    followers: number;
    following: number;
  };
  relationships: {
    blocked: Array<{ id: string; handle: string; displayName: string | null }>;
    blockedBy: Array<{ id: string; handle: string; displayName: string | null }>;
    muted: Array<{ id: string; handle: string; displayName: string | null }>;
    mutedBy: Array<{ id: string; handle: string; displayName: string | null }>;
  };
}

export interface Poll {
  id: string;
  ownerId: string;
  question: string;
  isContinuous: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE' | null;
  maxSelections: number | null;
  minValue: number | null;
  maxValue: number | null;
  step: number | null;
  visibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE_LINK';
  privateLinkToken: string | null;
  expiresAt: string | null;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    handle: string;
    displayName: string | null;
  };
  options?: Array<{
    id: string;
    text: string;
    position: number;
    _count?: {
      votes: number;
    };
  }>;
  _count?: {
    votes: number;
    sliderResponses: number;
  };
}

export interface PollDetails extends Poll {
  options: Array<{
    id: string;
    text: string;
    position: number;
    _count: {
      votes: number;
    };
  }>;
  counts: {
    votes: number;
    sliderResponses: number;
  };
  responseDistribution: {
    type: 'discrete' | 'slider';
    options?: Array<{
      optionId: string;
      optionText: string;
      voteCount: number;
    }>;
    responses?: Array<{
      userId: string;
      user: {
        id: string;
        handle: string;
        displayName: string | null;
      };
      value: number;
      createdAt: string;
    }>;
  };
}

export interface Vote {
  id: string;
  pollId: string;
  voterId: string;
  optionId: string;
  isHidden: boolean;
  isSharedPublicly: boolean;
  publicComment: string | null;
  flipFlopCount: number;
  createdAt: string;
  updatedAt: string;
  voter?: {
    id: string;
    handle: string;
    displayName: string | null;
  };
  option?: {
    id: string;
    text: string;
  };
  poll?: {
    id: string;
    question: string;
  };
}

export interface SliderResponse {
  id: string;
  pollId: string;
  userId: string;
  value: number;
  isHidden: boolean;
  isSharedPublicly: boolean;
  publicComment: string | null;
  flipFlopCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    handle: string;
    displayName: string | null;
  };
  poll?: {
    id: string;
    question: string;
  };
}

export interface VisibilitySimulationResult {
  allowed: boolean;
  reason: string;
  debug: Record<string, any>;
}
