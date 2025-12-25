/**
 * Pure visibility rule functions
 * No Prisma, no side effects - just business logic
 */

export type PollVisibility = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE_LINK';

export interface VisibilityContext {
  viewerId: string | null;
  ownerId: string;
  pollVisibility: PollVisibility;
  privateLinkToken?: string;
  providedToken?: string;
  areMutuals: boolean;
}

/**
 * Check if a poll can be viewed based on visibility rules
 */
export function canViewPoll(context: VisibilityContext): boolean {
  const { pollVisibility, viewerId, ownerId, privateLinkToken, providedToken, areMutuals } = context;

  // PRIVATE_LINK polls require the token
  if (pollVisibility === 'PRIVATE_LINK') {
    if (!providedToken || privateLinkToken !== providedToken) {
      return false;
    }
    return true; // Token matches, can view
  }

  // PUBLIC polls are visible to everyone
  if (pollVisibility === 'PUBLIC') {
    return true;
  }

  // FRIENDS_ONLY polls require mutual follows
  if (pollVisibility === 'FRIENDS_ONLY') {
    if (!viewerId) {
      return false; // Must be authenticated
    }
    if (ownerId === viewerId) {
      return true; // Owner can always view their own polls
    }
    return areMutuals; // Must be mutual follows (friends)
  }

  return false;
}

/**
 * Check if a profile can be viewed based on privacy settings
 */
export function canViewProfile(context: {
  viewerId: string | null;
  profileId: string;
  isPrivate: boolean;
  areMutuals: boolean;
}): boolean {
  const { viewerId, profileId, isPrivate, areMutuals } = context;

  // Owner can always view their own profile
  if (viewerId === profileId) {
    return true;
  }

  // Private profiles require mutual follows
  if (isPrivate) {
    if (!viewerId) {
      return false; // Must be authenticated
    }
    return areMutuals;
  }

  // Public profiles are visible to everyone
  return true;
}

/**
 * Check if a response (vote/slider) can be viewed
 */
export function canViewResponse(context: {
  canViewPoll: boolean;
  responseOwnerId: string;
  viewerId: string | null;
  isHidden: boolean;
}): boolean {
  const { canViewPoll, responseOwnerId, viewerId, isHidden } = context;

  // Must be able to view the poll first
  if (!canViewPoll) {
    return false;
  }

  // Owner can always see their own responses
  if (viewerId === responseOwnerId) {
    return true;
  }

  // Hidden responses are not visible to others
  if (isHidden) {
    return false;
  }

  return true;
}

