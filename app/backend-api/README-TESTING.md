# Spill Backend Testing

This document describes the comprehensive testing setup for the Spill backend, including validation tests, database integration tests, and testing best practices.

## 🧪 Testing Architecture

### Framework
- **Vitest** for all tests (following workspace backend rules)
- **Testcontainers** for database integration tests  
- **Supertest** for HTTP route testing
- **Node environment** with globals enabled

### Test Organization
```
src/tests/
├── validations/                    # Validation function tests (no database)
│   ├── user.validations.test.ts    # User validation tests
│   ├── poll.validations.test.ts    # Poll validation tests  
│   ├── social.validations.test.ts  # Social validation tests
│   └── general.validations.test.ts # General utility validation tests
├── repositories/                   # Repository tests (with database)
├── integration/                    # Integration tests
├── global-setup.js                 # Database container setup
└── setup-tests.js                  # Test cleanup between runs
```

## 🔧 Configuration Files

### Main Test Config (`vitest.config.js`)
- Database integration tests with Testcontainers
- Serial execution to avoid shared-state races
- TRUNCATE + RESTART IDENTITY between tests
- 60s timeout for container startup

### Validation Test Config (`vitest.validations.config.js`)
- Pure validation tests (no database required)
- Faster execution (10s timeout)
- Focused coverage on validation logic only

## 📋 Validation Testing

### Domain-Specific Validation Files

#### User Validations (`src/lib/validations/user.validations.ts`)
```typescript
export class UserValidations {
  static validateHandle(handle: string): void
  static validateDisplayName(displayName: string | null | undefined): void  
  static validateUserIds(userId1: string, userId2: string, operation: string): void
}
```

**Tests Cover:**
- ✅ Valid handle formats (letters, numbers, underscores, hyphens)
- ✅ Handle length constraints (2-50 characters)
- ✅ Handle character restrictions (must start with letter/number)
- ✅ Display name validation (optional, 100 char max)
- ✅ User ID validation for social operations

#### Poll Validations (`src/lib/validations/poll.validations.ts`)
```typescript
export class PollValidations {
  static validateQuestion(question: string): void
  static validateDiscretePollData(data: CreatePollData): void
  static validateContinuousPollData(data: CreatePollData): void
  static validateSliderValue(value: number, minValue: number | null, maxValue: number | null): void
  static validatePollExpiration(expiresAt: Date | null | undefined): void
  static validateMediaUrls(mediaUrls: string[] | null | undefined): void
}
```

**Tests Cover:**
- ✅ Poll question validation (required, max 500 chars)
- ✅ Discrete poll requirements (2-10 options, selection type)
- ✅ Continuous poll requirements (min/max values, step validation)
- ✅ Option text validation (max 200 chars, no duplicates)
- ✅ Option position validation (unique, positive numbers)
- ✅ maxSelections validation for MULTIPLE polls
- ✅ Slider value range validation
- ✅ Poll expiration date validation (future, max 1 year)
- ✅ Media URL validation (max 4, valid URLs)

#### Social Validations (`src/lib/validations/social.validations.ts`)
```typescript
export class SocialValidations {
  static validateFollowData(followerId: string, followeeId: string): void
  static validateBlockData(blockerId: string, blockedId: string): void
  static validateMuteData(muterId: string, mutedId: string): void
}
```

**Tests Cover:**
- ✅ Follow/block/mute self-prevention
- ✅ Required user ID validation
- ✅ Operation-specific error messages

#### General Validations (`src/lib/validations/general.validations.ts`)
```typescript
export class GeneralValidations {
  static validatePaginationParams(cursor?: string, limit?: number, maxLimit?: number): {cursor?: string; limit: number}
  static validateSearchQuery(query: string): string
  static validateId(id: string, resourceName: string): void
  static validateIds(ids: string[], resourceName: string): void
}
```

**Tests Cover:**
- ✅ Pagination parameter validation (positive limits, cursor format)
- ✅ Search query validation (2-100 chars, trimming)
- ✅ ID validation (required, non-empty strings)
- ✅ ID array validation (non-empty arrays, valid IDs)

## 🚀 Running Tests

### Validation Tests Only (Fast)
```bash
npm run test:run -- --config vitest.validations.config.js src/tests/validations/
```

### All Tests with Database
```bash
npm run test:run
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm test
```

## 📊 Test Results Summary

**Current Status: ✅ All 54 validation tests passing**

- **User Validations**: 10 tests
- **Poll Validations**: 25 tests  
- **Social Validations**: 9 tests
- **General Validations**: 10 tests

### Coverage Areas
- ✅ Input validation edge cases
- ✅ Data type validation
- ✅ Length and range constraints  
- ✅ Format validation (handles, URLs)
- ✅ Business rule validation
- ✅ Error message accuracy
- ✅ Cross-field validation

## 🔍 Validation Design Principles

### 1. **Explicit Validation Functions**
Each validation is a separate, testable function with clear responsibility.

### 2. **Domain Separation**  
Validations are organized by domain (User, Poll, Social) for maintainability.

### 3. **Early Validation**
Input validation happens before database operations to catch errors early.

### 4. **Comprehensive Error Messages**
Each validation provides specific, actionable error messages.

### 5. **Type Safety**
All validations work with TypeScript types for compile-time safety.

## 🛠️ Adding New Validations

### 1. Add to appropriate validation class:
```typescript
// src/lib/validations/user.validations.ts
static validateNewField(value: string): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError('New field is required and must be a string');
  }
  // Additional validation logic...
}
```

### 2. Add comprehensive tests:
```typescript
// src/tests/validations/user.validations.test.ts
describe('validateNewField', () => {
  it('should accept valid values', () => {
    expect(() => UserValidations.validateNewField('valid')).not.toThrow();
  });

  it('should reject invalid values', () => {
    expect(() => UserValidations.validateNewField(''))
      .toThrow(new ValidationError('New field is required and must be a string'));
  });
});
```

### 3. Use in repositories:
```typescript
// src/db/repositories/user.repository.ts
async create(data: CreateUserData): Promise<User> {
  UserValidations.validateHandle(data.handle);
  UserValidations.validateDisplayName(data.displayName);
  UserValidations.validateNewField(data.newField); // Add here
  
  return withErrorMapping(() => prisma.user.create({ data }));
}
```

## 🎯 Next Steps

1. **Repository Tests**: Create integration tests for each repository
2. **Service Tests**: Test business logic with mocked repositories  
3. **Route Tests**: HTTP endpoint testing with supertest
4. **End-to-End Tests**: Full workflow testing
5. **Performance Tests**: Load testing for database operations

The validation layer provides a solid foundation with 100% test coverage, ensuring data integrity and clear error handling throughout the application. 