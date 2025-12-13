-- CreateEnum for FollowRequestStatus
CREATE TYPE "FollowRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Update PollVisibility enum
-- First, add new enum values
-- Note: IF NOT EXISTS is not supported in all PostgreSQL versions, but these values are new
ALTER TYPE "PollVisibility" ADD VALUE 'FRIENDS_ONLY';
ALTER TYPE "PollVisibility" ADD VALUE 'PRIVATE_LINK';

-- Migrate existing data: map FOLLOWERS and MUTUALS to FRIENDS_ONLY (closest equivalent)
UPDATE "Poll" SET "visibility" = 'FRIENDS_ONLY' WHERE "visibility" = 'FOLLOWERS';
UPDATE "Poll" SET "visibility" = 'FRIENDS_ONLY' WHERE "visibility" = 'MUTUALS';

-- Note: We cannot directly remove enum values in PostgreSQL without recreating the enum.
-- The old values (FOLLOWERS, MUTUALS) will remain in the enum type but won't be used.
-- If you need to completely remove them, you would need to:
-- 1. Create a new enum type
-- 2. Update all columns to use the new type
-- 3. Drop the old enum type
-- This is complex and Prisma doesn't handle it automatically.

-- AlterTable: Add new fields to User
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "hideVotesFromFriends" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add privateLinkToken to Poll
ALTER TABLE "Poll" ADD COLUMN "privateLinkToken" TEXT;

-- CreateIndex for privateLinkToken (before unique constraint)
CREATE INDEX "Poll_privateLinkToken_idx" ON "Poll"("privateLinkToken");

-- Add unique constraint for privateLinkToken
CREATE UNIQUE INDEX "Poll_privateLinkToken_key" ON "Poll"("privateLinkToken") WHERE "privateLinkToken" IS NOT NULL;

-- AlterTable: Add visibility fields to Vote
ALTER TABLE "Vote" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vote" ADD COLUMN "isSharedPublicly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vote" ADD COLUMN "publicComment" TEXT;
ALTER TABLE "Vote" ADD COLUMN "flipFlopCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vote" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing votes: set updatedAt to createdAt for existing records
-- (Default will be CURRENT_TIMESTAMP, but we want to preserve original creation time)
UPDATE "Vote" SET "updatedAt" = "createdAt";

-- CreateIndex for Vote visibility fields
CREATE INDEX "Vote_isSharedPublicly_idx" ON "Vote"("isSharedPublicly");

-- AlterTable: Add visibility fields to SliderResponse
ALTER TABLE "SliderResponse" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SliderResponse" ADD COLUMN "isSharedPublicly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SliderResponse" ADD COLUMN "publicComment" TEXT;
ALTER TABLE "SliderResponse" ADD COLUMN "flipFlopCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SliderResponse" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing slider responses: set updatedAt to createdAt for existing records
-- (Default will be CURRENT_TIMESTAMP, but we want to preserve original creation time)
UPDATE "SliderResponse" SET "updatedAt" = "createdAt";

-- CreateIndex for SliderResponse visibility fields
CREATE INDEX "SliderResponse_isSharedPublicly_idx" ON "SliderResponse"("isSharedPublicly");

-- CreateTable: FollowRequest
CREATE TABLE "FollowRequest" (
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("followerId","followeeId")
);

-- CreateIndex for FollowRequest
CREATE INDEX "FollowRequest_followerId_idx" ON "FollowRequest"("followerId");
CREATE INDEX "FollowRequest_followeeId_idx" ON "FollowRequest"("followeeId");
CREATE INDEX "FollowRequest_status_idx" ON "FollowRequest"("status");

-- AddForeignKey for FollowRequest
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
