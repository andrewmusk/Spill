# Spill Database Layer

This document describes the complete database layer implementation for the Spill social polling application.

## 🏗️ Architecture Overview

The database layer follows a clean architecture with:
- **Prisma ORM** for type-safe database access
- **Repository pattern** for data access abstraction
- **Error handling** with domain-specific error types
- **Utilities** for common database operations
- **PostgreSQL** as the database engine

## 📊 Database Schema

### Core Models

#### User
- **Purpose**: Manages user accounts and profiles
- **Key Fields**: `id`, `handle`, `displayName`, `isPrivate`
- **Features**: Unique handles, private/public accounts

#### Poll
- **Purpose**: Stores poll questions and configuration
- **Types**: Discrete (multiple choice) and Continuous (slider)
- **Key Fields**: `question`, `isContinuous`, `selectionType`, `visibility`
- **Features**: Expiration, media support, visibility control

#### PollOption
- **Purpose**: Options for discrete polls
- **Key Fields**: `text`, `position`
- **Features**: Ordered options, linked to polls

#### Vote
- **Purpose**: User responses to discrete polls
- **Key Fields**: `pollId`, `voterId`, `optionId`
- **Features**: Prevents duplicate votes per user/option

#### SliderResponse
- **Purpose**: User responses to continuous polls
- **Key Fields**: `value`, `pollId`, `userId`
- **Features**: Numeric responses, one per user per poll

#### Social Graph Models
- **Follow**: Accepted follow relationships
- **Block**: Block relationships (removes follows)
- **Mute**: Mute relationships (hides content)
- **SkippedPoll**: Tracks polls user has skipped

### Enums

#### PollVisibility
- `PUBLIC`: Anyone can see
- `FOLLOWERS`: Only followers can see
- `MUTUALS`: Only mutual followers can see

#### SelectionType
- `SINGLE`: Pick one option
- `MULTIPLE`: Pick multiple options (up to `maxSelections`)

## 🏛️ Repository Layer

### UserRepository
```typescript
// Core operations
create(data: CreateUserData): Promise<User>
findById(id: string): Promise<User | null>
findByHandle(handle: string): Promise<User | null>
update(id: string, data: UpdateUserData): Promise<User>
delete(id: string): Promise<void>

// Advanced queries
search(query: string, limit?: number): Promise<User[]>
getFollowers(userId: string, cursor?: string, limit?: number): Promise<User[]>
getFollowing(userId: string, cursor?: string, limit?: number): Promise<User[]>
findWithCounts(id: string): Promise<UserWithCounts | null>

// Relationship checks
isFollowing(followerId: string, followeeId: string): Promise<boolean>
isBlocked(blockerId: string, blockedId: string): Promise<boolean>
isMuted(muterId: string, mutedId: string): Promise<boolean>
```

### PollRepository
```typescript
// Core operations
create(data: CreatePollData): Promise<Poll>
findById(id: string): Promise<Poll | null>
findWithDetails(id: string): Promise<PollWithDetails | null>
update(id: string, data: UpdatePollData): Promise<Poll>
delete(id: string): Promise<void>

// Feed and discovery
getFeed(viewerId: string, cursor?: string, limit?: number): Promise<PollFeedItem[]>
getUserPolls(userId: string, cursor?: string, limit?: number): Promise<Poll[]>

// Voting operations
vote(pollId: string, voterId: string, optionId: string): Promise<Vote>
removeVote(pollId: string, voterId: string, optionId: string): Promise<void>
submitSliderResponse(pollId: string, userId: string, value: number): Promise<SliderResponse>
skipPoll(userId: string, pollId: string): Promise<void>

// User interaction queries
getUserVoteForPoll(pollId: string, userId: string): Promise<Vote[]>
getUserSliderResponse(pollId: string, userId: string): Promise<SliderResponse | null>
```

### SocialRepository
```typescript
// Follow operations
follow(data: FollowData): Promise<Follow>
unfollow(followerId: string, followeeId: string): Promise<void>
isFollowing(followerId: string, followeeId: string): Promise<boolean>
getMutualFollows(userId1: string, userId2: string): Promise<{...}>

// Block operations
block(data: BlockData): Promise<Block>
unblock(blockerId: string, blockedId: string): Promise<void>
isBlocked(blockerId: string, blockedId: string): Promise<boolean>
getBlockedUsers(userId: string, cursor?: string, limit?: number): Promise<User[]>

// Mute operations
mute(data: MuteData): Promise<Mute>
unmute(muterId: string, mutedId: string): Promise<void>
isMuted(muterId: string, mutedId: string): Promise<boolean>
getMutedUsers(userId: string, cursor?: string, limit?: number): Promise<User[]>

// Relationship status
getRelationshipStatus(userId: string, targetUserId: string): Promise<{...}>

// Batch operations for feed filtering
getBlockedUserIds(userId: string): Promise<string[]>
getMutedUserIds(userId: string): Promise<string[]>
getFollowingUserIds(userId: string): Promise<string[]>
```

## 🛠️ Database Utilities

### Error Handling
- **DatabaseError**: Base error class
- **NotFoundError**: Resource not found
- **ConflictError**: Constraint violations (duplicates)
- **ValidationError**: Data validation failures
- **mapPrismaError()**: Maps Prisma errors to domain errors

### Pagination Utilities
- **validatePaginationParams()**: Validates and clamps pagination params
- **createPaginatedResult()**: Creates paginated response format
- **buildCursorQuery()**: Builds cursor-based pagination queries

### Query Utilities
- **runInTransaction()**: Execute operations in database transaction
- **buildSearchFilter()**: Creates search filters for text fields
- **getTimeRangeFilter()**: Creates time-based filters
- **checkDatabaseHealth()**: Database health check

## 🔧 Usage Examples

### Creating a User
```typescript
import { userRepository } from './src/db/index.js';

const user = await userRepository.create({
  handle: 'johndoe',
  displayName: 'John Doe',
  isPrivate: false,
});
```

### Creating a Poll
```typescript
import { pollRepository } from './src/db/index.js';

// Discrete poll
const discretePoll = await pollRepository.create({
  ownerId: userId,
  question: 'What\'s your favorite color?',
  isContinuous: false,
  selectionType: 'SINGLE',
  visibility: 'PUBLIC',
  options: [
    { text: 'Red', position: 1 },
    { text: 'Blue', position: 2 },
    { text: 'Green', position: 3 },
  ],
});

// Continuous poll
const continuousPoll = await pollRepository.create({
  ownerId: userId,
  question: 'Rate your satisfaction (1-10)',
  isContinuous: true,
  minValue: 1,
  maxValue: 10,
  step: 1,
  visibility: 'PUBLIC',
});
```

### Social Interactions
```typescript
import { socialRepository } from './src/db/index.js';

// Follow a user
await socialRepository.follow({
  followerId: currentUserId,
  followeeId: targetUserId,
});

// Check relationship status
const status = await socialRepository.getRelationshipStatus(
  currentUserId, 
  targetUserId
);
console.log(status); // { following: true, followedBy: false, ... }
```

### Voting
```typescript
import { pollRepository } from './src/db/index.js';

// Vote on discrete poll
await pollRepository.vote(pollId, userId, optionId);

// Submit slider response
await pollRepository.submitSliderResponse(pollId, userId, 7.5);
```

## 🚀 Performance Features

### Indexing
- **Composite indexes** on relationship tables
- **Single column indexes** for frequently queried fields
- **Cursor pagination** for efficient large dataset navigation

### Query Optimization
- **Selective includes** to avoid over-fetching
- **Batch operations** for multiple related queries
- **Connection pooling** via Prisma

### Security Features
- **Input validation** via Zod schemas
- **Parameterized queries** (Prisma handles this)
- **Error sanitization** to prevent information leakage
- **Cascade deletes** for data consistency

## 📁 File Structure

```
src/
├── db/
│   ├── index.ts                    # Main exports and repository instances
│   ├── errors.ts                   # Error types and mapping
│   └── repositories/
│       ├── user.repository.ts      # User data access
│       ├── poll.repository.ts      # Poll and voting data access
│       └── social.repository.ts    # Social graph data access
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   └── db-utils.ts                 # Database utilities
└── generated/
    └── prisma/                     # Generated Prisma client
```

## 🧪 Testing

The database layer has been thoroughly tested with:
- ✅ User CRUD operations
- ✅ Poll creation (discrete and continuous)
- ✅ Voting and slider responses
- ✅ Social graph operations (follow/block/mute)
- ✅ Complex queries with relationships
- ✅ Error handling and constraints
- ✅ Data integrity and cleanup

## 🔄 Migration Management

Database schema changes are managed through Prisma migrations:

```bash
# Create a new migration
npx prisma migrate dev --name "description-of-changes"

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 🌟 Key Features Implemented

1. **Complete Social Polling System**: Discrete and continuous polls with full voting functionality
2. **Robust Social Graph**: Follow/block/mute relationships with proper constraints
3. **Flexible Visibility**: Public, followers-only, and mutuals-only content
4. **Type Safety**: Full TypeScript integration with generated types
5. **Error Handling**: Comprehensive error mapping and domain-specific errors
6. **Performance**: Optimized queries, indexes, and cursor pagination
7. **Data Integrity**: Proper constraints, cascading deletes, and validation
8. **Extensibility**: Clean architecture allowing easy feature additions

The Spill database layer is now production-ready and provides a solid foundation for building the social polling application! 🚀 