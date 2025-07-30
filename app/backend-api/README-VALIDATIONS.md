# Validation Usage in Spill Backend

This document shows how validations are integrated throughout the database layer and where they are enforced.

## 🔍 Validation Integration Points

### 1. Repository Layer (`src/db/repositories/`)

All data validation happens at the repository layer before database operations. This ensures:
- **Early validation** - Catch errors before expensive database operations
- **Consistent rules** - Same validation logic everywhere
- **Clear error messages** - Specific, actionable feedback
- **Type safety** - Integration with TypeScript types

## 📊 Validation Usage Map

### User Repository (`user.repository.ts`)

| Method | Validations Applied |
|--------|-------------------|
| `create()` | • `UserValidations.validateHandle()` - Handle format & length<br>• `UserValidations.validateDisplayName()` - Display name rules |
| `update()` | • `UserValidations.validateDisplayName()` - Display name rules |

**Example Usage:**
```typescript
async create(data: CreateUserData): Promise<User> {
  // Use centralized validation functions
  UserValidations.validateHandle(data.handle);
  UserValidations.validateDisplayName(data.displayName);

  return withErrorMapping(() => prisma.user.create({ data }));
}
```

### Poll Repository (`poll.repository.ts`)

| Method | Validations Applied |
|--------|-------------------|
| `create()` | • `PollValidations.validateQuestion()` - Question format & length<br>• `PollValidations.validateDiscretePollData()` - Options, selection type<br>• `PollValidations.validateContinuousPollData()` - Min/max values, step<br>• `PollValidations.validatePollExpiration()` - Future date, max 1 year<br>• `PollValidations.validateMediaUrls()` - Valid URLs, max 4 |
| `submitSliderResponse()` | • `PollValidations.validateSliderValue()` - Value within poll range |

**Example Usage:**
```typescript
async create(data: CreatePollData): Promise<Poll> {
  // Use centralized validation functions
  PollValidations.validateQuestion(data.question);
  PollValidations.validateDiscretePollData(data);
  PollValidations.validateContinuousPollData(data);
  PollValidations.validatePollExpiration(data.expiresAt);
  PollValidations.validateMediaUrls(data.mediaUrls);

  return withErrorMapping(() => prisma.poll.create({ /* ... */ }));
}
```

### Social Repository (`social.repository.ts`)

| Method | Validations Applied |
|--------|-------------------|
| `follow()` | • `SocialValidations.validateFollowData()` - Prevent self-follow, check IDs |
| `block()` | • `SocialValidations.validateBlockData()` - Prevent self-block, check IDs |
| `mute()` | • `SocialValidations.validateMuteData()` - Prevent self-mute, check IDs |

**Example Usage:**
```typescript
async follow(data: FollowData): Promise<Follow> {
  const { followerId, followeeId } = data;
  
  // Use centralized validation
  SocialValidations.validateFollowData(followerId, followeeId);

  // Business logic checks...
  return withErrorMapping(() => prisma.follow.create({ data }));
}
```

## 🎯 Validation vs Business Logic

### Validation (Input/Data Rules)
- **Format validation** - Handle format, email format, URL format
- **Length constraints** - Min/max character limits
- **Type checking** - Required fields, data types
- **Range validation** - Slider values, dates, counts

### Business Logic (Domain Rules)
- **Relationship checks** - Already following, blocked status
- **State validation** - Poll expiration, user permissions
- **Complex constraints** - Feed filtering, privacy rules

**Example Separation:**
```typescript
async follow(data: FollowData): Promise<Follow> {
  // ✅ VALIDATION (centralized)
  SocialValidations.validateFollowData(followerId, followeeId);

  // ✅ BUSINESS LOGIC (repository-specific)
  const existing = await this.isFollowing(followerId, followeeId);
  if (existing) {
    throw new ConflictError('Already following this user');
  }

  const isBlocked = await this.isBlocked(followeeId, followerId);
  if (isBlocked) {
    throw new ConflictError('Cannot follow a user who has blocked you');
  }

  return withErrorMapping(() => prisma.follow.create({ data }));
}
```

## 🔧 Error Handling Flow

```
1. HTTP Request → Route Handler
2. Route Handler → Repository Method
3. Repository Method → Validation Functions
4. Validation Functions → Throw ValidationError (if invalid)
5. Repository Method → Database Operation (if valid)
6. Repository Method → Return Result or Throw DatabaseError
7. Route Handler → Error Middleware → HTTP Response
```

### Error Types Thrown by Validations

```typescript
// ValidationError - Input validation failures
throw new ValidationError('Handle must be at least 2 characters long');

// ConflictError - Business rule violations  
throw new ConflictError('Cannot follow yourself');

// NotFoundError - Resource not found
throw new NotFoundError('User', userId);
```

## 📝 Adding New Validations

### 1. Add to Validation Class
```typescript
// src/lib/validations/user.validations.ts
static validateBio(bio: string | null | undefined): void {
  if (bio !== null && bio !== undefined) {
    if (typeof bio !== 'string') {
      throw new ValidationError('Bio must be a string');
    }
    if (bio.length > 500) {
      throw new ValidationError('Bio must be no more than 500 characters');
    }
  }
}
```

### 2. Add Tests
```typescript
// src/tests/validations/user.validations.test.ts
describe('validateBio', () => {
  it('should accept valid bios', () => {
    expect(() => UserValidations.validateBio('Valid bio')).not.toThrow();
    expect(() => UserValidations.validateBio(null)).not.toThrow();
  });

  it('should reject invalid bios', () => {
    expect(() => UserValidations.validateBio('A'.repeat(501)))
      .toThrow(new ValidationError('Bio must be no more than 500 characters'));
  });
});
```

### 3. Use in Repository
```typescript
// src/db/repositories/user.repository.ts
async update(id: string, data: UpdateUserData): Promise<User> {
  UserValidations.validateDisplayName(data.displayName);
  UserValidations.validateBio(data.bio); // Add new validation

  return withErrorMapping(() => prisma.user.update({ where: { id }, data }));
}
```

## 🚀 Benefits of Centralized Validations

### ✅ **Consistency**
- Same validation rules everywhere
- Uniform error messages
- Centralized business rules

### ✅ **Testability**  
- Each validation function independently tested
- 54 comprehensive validation tests
- Edge cases covered

### ✅ **Maintainability**
- Single place to update validation rules
- Domain-organized validation files
- Clear separation of concerns

### ✅ **Type Safety**
- TypeScript integration
- Compile-time validation checks
- IDE autocompletion and error detection

### ✅ **Performance**
- Early validation before expensive DB operations
- Fail fast on invalid input
- Reduced database load

## 📊 Current Validation Coverage

| Domain | Validation Functions | Repository Integration | Tests |
|--------|---------------------|----------------------|-------|
| **User** | 3 functions | ✅ create, update | 10 tests |
| **Poll** | 6 functions | ✅ create, sliderResponse | 25 tests |
| **Social** | 3 functions | ✅ follow, block, mute | 9 tests |
| **General** | 4 functions | Used across repositories | 10 tests |

**Total: 16 validation functions, 54 tests, 100% coverage**

This centralized validation approach ensures data integrity and provides clear, consistent error handling throughout the Spill application. 