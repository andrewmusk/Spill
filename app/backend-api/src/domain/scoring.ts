/**
 * Pure scoring/ranking functions
 * No Prisma, no side effects - just calculation logic
 */

/**
 * Calculate flip-flop count increment
 * When a user changes their vote/response, increment the flip-flop count
 */
export function calculateFlipFlopCount(currentCount: number): number {
  return currentCount + 1;
}

/**
 * Calculate initial flip-flop count (0 for first vote/response)
 */
export function getInitialFlipFlopCount(): number {
  return 0;
}

