# Spill: Social, Privacy, and Voting Dynamics

This document describes the complete social and relationship dynamics implemented in the Spill backend API.

## Table of Contents

1. [Account Types](#1-account-types)
2. [Relationship Layers](#2-relationship-layers)
3. [Poll Privacy Modes](#3-poll-privacy-modes)
4. [Vote Visibility](#4-vote-visibility)
5. [Vote Regret + Edit Behavior](#5-vote-regret--edit-behavior)
6. [Incentive Mechanics](#6-incentive-mechanics)
7. [Public Vote Sharing](#7-public-vote-sharing)
8. [Profile Structure](#8-profile-structure)
9. [Social Dynamics Enabled](#9-social-dynamics-enabled)
10. [Database Schema](#10-database-schema)
11. [API Implications](#11-api-implications)

---

## 1. Account Types

### Public Accounts

- **Anyone can follow** - No approval required
- **Polls are visible to everyone** - All polls appear in public feeds
- **Vote activity can be visible** - Based on user's vote visibility settings
- **Can form Friends** - Mutual follows create the trust layer

### Private Accounts

- **Follow requests must be approved** - Followers must request access
- **Only approved followers can see polls** - Polls are hidden from non-followers
- **Only approved followers can see vote activity** - Vote visibility restricted to followers
- **Friends (mutual follows) form the trust layer** - Mutual follows have enhanced visibility
- **Sharing beyond followers is not allowed** - Content stays within follower network

**Key principle:** Followers = access. Friends = trust.

---

## 2. Relationship Layers

### Followers (One-Way)

Followers represent a one-way relationship where:
- **Gives access** to polls and vote activity (if allowed by settings)
- **Increases poll ranking** in feed algorithms
- **Does not grant visibility** into your votes unless explicitly allowed
- **For private accounts**: Requires approval via follow request

### Friends (Mutual)

Friends represent a two-way trust relationship:
- **Trust layer** - Both users follow each other
- **See vote choices by default** - Friends can see each other's votes automatically
- **Activity drives recommendations** - Friend activity influences feed and suggestions
- **Enhanced visibility** - Friends have access to friend-only polls

**Friendship is automatically established** when both users follow each other. There is no separate "friend request" - mutual follows create the friendship.

---

## 3. Poll Privacy Modes

Polls can have three privacy modes:

### Public
- **Anyone can view and vote** - No restrictions
- **Appears in public feeds** - Discoverable by all users
- **Votes can be shared publicly** - Users can opt to share their votes

### Friends Only
- **Only mutual follows (friends) can view and vote** - Requires both users to follow each other
- **Not visible to one-way followers** - Only friends see these polls
- **Private sharing** - Votes can only be shared with friends

### Private Link
- **Only those with the link can view and vote** - Access controlled by unique token
- **Not discoverable** - Won't appear in feeds or search
- **Shareable link** - Poll owner can share the link with specific people
- **Token-based access** - Each private link poll has a unique `privateLinkToken`

---

## 4. Vote Visibility

### Default Behavior

- **Friends see your votes automatically** - Mutual follows can see vote choices by default
- **Friends see votes only after they vote** - Vote choices revealed after friend votes (incentive mechanic)
- **Followers see votes if allowed** - Based on per-poll and global settings

### Visibility Options

Users can control vote visibility at multiple levels:

1. **Hide my vote for this poll** (`isHidden` per vote)
   - Hides this specific vote from friends and followers
   - Overrides global settings for this poll

2. **Hide all votes from friends** (`hideVotesFromFriends` global setting)
   - Global setting that hides all votes from friends
   - Can be overridden per-poll with `isHidden = false`

3. **Share my vote publicly** (`isSharedPublicly` per vote)
   - Only available for public polls
   - Appears on user profile under "Votes" or "My Picks"
   - Appears in follower feed
   - Can include optional comment (`publicComment`)

### Public vs Private Accounts

- **Public accounts**: Can share votes to all followers and publicly
- **Private accounts**: Can only share votes to approved followers or friends

---

## 5. Vote Regret + Edit Behavior

### Vote Changes

- **Users can change their vote anytime** - No restrictions on vote edits
- **Only the final vote is displayed** - Previous votes are not shown
- **Flip-flop count is tracked** - `flipFlopCount` increments on each change
- **Flip-flop count visible to friends** - Friends can see how many times you changed your vote (subtle indicator)
- **Users can hide their vote per poll** - Can opt out of showing vote changes

### Implementation Details

- Each vote change increments `flipFlopCount`
- `updatedAt` timestamp tracks when vote was last changed
- Friends see flip-flop count only after they have voted (incentive mechanic)
- Vote history is not stored - only current vote and change count

---

## 6. Incentive Mechanics

The system uses several incentive mechanics to encourage engagement:

### Friend Vote Reveals

- **Before voting**: Shows "X friends voted" (count only)
- **After voting**: Reveals which friends picked what
- **Encourages voting**: Users vote to see friend choices
- **Social proof**: Seeing friend activity increases engagement

### Flip-Flop Visibility

- **Flip-flop counts visible only after voting** - Friends must vote to see change counts
- **Subtle indicator** - Shows engagement without being judgmental
- **Encourages thoughtful voting** - But allows flexibility

### Feed Ranking

- **Friend activity drives recommendations** - Friend votes increase poll visibility
- **Follower activity increases ranking** - Followers' engagement boosts poll position
- **Social signals** - Network effects amplify content discovery

---

## 7. Public Vote Sharing

### Sharing Features

- **Appears on user profile** - Under "Votes" or "My Picks" section
- **Appears in follower feed** - Shared votes show up in followers' feeds
- **Optional comment** - Users can add `publicComment` when sharing
- **Only for public polls** - Private and friend-only polls cannot be shared publicly

### Sharing Controls

- **Per-vote control** - Each vote can be individually shared
- **Public polls only** - `isSharedPublicly` only applies to public polls
- **Comment support** - Optional `publicComment` field for context

---

## 8. Profile Structure

User profiles have three main sections:

### Polls
- **Polls created by the user** - All polls owned by the user
- **Filtered by privacy** - Only visible polls based on viewer relationship
- **Chronological order** - Most recent first

### Votes
- **Publicly shared votes** - Only votes with `isSharedPublicly = true`
- **Includes comments** - Shows `publicComment` if provided
- **Friend-only votes do not appear** - Private vote activity stays private

### About
- **Bio** - User's `bio` field
- **Metadata** - Account type, follower/following counts, etc.
- **Profile information** - Display name, handle, etc.

**Note:** Friend-only vote activity does not appear on profile. Only publicly shared votes are visible.

---

## 9. Social Dynamics Enabled

The system enables several key social dynamics:

### "Your Friends Think X" Loop
- Friends' choices revealed after voting creates social influence
- Encourages users to vote to see friend opinions
- Creates engagement loops through social proof

### Identity Expression
- Public vote sharing allows users to express opinions
- Profile votes section showcases user's choices
- Comments add context and personality

### Sensitivity Protection
- Private accounts protect user privacy
- Vote hiding options prevent unwanted visibility
- Friend-only polls allow intimate discussions

### Simple Mental Model
- **Followers = Access** - Clear understanding of one-way relationships
- **Friends = Trust** - Mutual follows create trusted connections
- **Simple rules** - Easy to understand privacy and visibility controls

---

## 10. Database Schema

### New Models

#### FollowRequest
Handles pending follow requests for private accounts:
- `followerId` - User requesting to follow
- `followeeId` - Private account being followed
- `status` - PENDING, ACCEPTED, or REJECTED
- `createdAt` - When request was created
- `respondedAt` - When request was accepted/rejected

### Updated Models

#### User
- `bio` - Optional bio for profile About section
- `hideVotesFromFriends` - Global setting to hide all votes from friends

#### Poll
- `privateLinkToken` - Unique token for private link polls
- `visibility` - Updated enum: PUBLIC, FRIENDS_ONLY, PRIVATE_LINK

#### Vote
- `isHidden` - Hide vote for this specific poll
- `isSharedPublicly` - Share vote publicly on profile/feed
- `publicComment` - Optional comment when sharing publicly
- `flipFlopCount` - Track number of vote changes
- `updatedAt` - Track when vote was last changed

#### SliderResponse
- Same visibility fields as Vote (for continuous polls)

### Enums

#### PollVisibility
- `PUBLIC` - Anyone can view and vote
- `FRIENDS_ONLY` - Only mutual follows can view and vote
- `PRIVATE_LINK` - Only those with the link can view and vote

#### FollowRequestStatus
- `PENDING` - Awaiting response
- `ACCEPTED` - Request accepted, follow created
- `REJECTED` - Request rejected

---

## 11. API Implications

### Follow Requests

For private accounts, the follow flow changes:
1. User attempts to follow private account
2. System creates `FollowRequest` with status PENDING
3. Private account owner can accept or reject
4. If accepted, `Follow` record is created and request status updated
5. If rejected, request status updated to REJECTED

### Poll Visibility Checks

API endpoints must check:
- **PUBLIC polls**: Visible to everyone
- **FRIENDS_ONLY polls**: Check if viewer and owner are mutual follows
- **PRIVATE_LINK polls**: Verify `privateLinkToken` matches request

### Vote Visibility Queries

When fetching votes, filter by:
- User's `hideVotesFromFriends` setting
- Per-vote `isHidden` flag
- Relationship status (friend vs follower)
- Poll privacy mode

### Feed Generation

Feed algorithms must consider:
- Friend activity for ranking
- Follower relationships for visibility
- Poll privacy modes
- Blocked/muted users
- Vote visibility settings

---

## Implementation Notes

### Follow Requests
- Only needed for private accounts
- Public accounts can follow directly (no request needed)
- When accepted, create `Follow` record and update request status
- When rejected, update request status only

### Vote Flip-Flop Counting
- Increment `flipFlopCount` on each vote change
- Only show count to friends after they vote
- Don't store vote history - only current vote and count

### Private Link Polls
- Generate unique `privateLinkToken` on creation
- Store token in database for validation
- Token should be cryptographically secure
- Include token in poll URL for sharing

### Friends Relationship
- Automatically established when both users follow each other
- No separate friend request needed
- Check mutual follows with: `isFollowing(user1, user2) && isFollowing(user2, user1)`

---

## Testing Considerations

When testing the social dynamics:

1. **Follow Request Flow**
   - Test follow request creation for private accounts
   - Test acceptance/rejection flows
   - Test direct follow for public accounts

2. **Vote Visibility**
   - Test friend vs follower visibility
   - Test global and per-poll hiding
   - Test public vote sharing

3. **Poll Privacy**
   - Test FRIENDS_ONLY poll access
   - Test PRIVATE_LINK poll token validation
   - Test PUBLIC poll visibility

4. **Flip-Flop Tracking**
   - Test vote change counting
   - Test friend visibility of flip-flop counts
   - Test vote hiding with flip-flops

5. **Feed Generation**
   - Test friend activity ranking
   - Test privacy mode filtering
   - Test vote visibility in feeds

---

This social dynamics system creates a rich, engaging social polling experience while maintaining user privacy and control. The clear distinction between followers (access) and friends (trust) provides an intuitive mental model for users to understand and control their social interactions.

