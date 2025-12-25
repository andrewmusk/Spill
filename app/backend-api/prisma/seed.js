import { PrismaClient } from '../generated/prisma/index.js';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function generatePrivateLinkToken() {
  return randomBytes(32).toString('base64url');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create 8 users (mix of public/private)
  // Using test Clerk IDs (format: user_ + random string)
  const users = [];
  const userData = [
    { handle: 'alice', displayName: 'Alice Smith', isPrivate: false, clerkId: 'user_test_alice_123' },
    { handle: 'bob', displayName: 'Bob Johnson', isPrivate: true, clerkId: 'user_test_bob_456' },
    { handle: 'charlie', displayName: 'Charlie Brown', isPrivate: false, clerkId: 'user_test_charlie_789' },
    { handle: 'diana', displayName: 'Diana Prince', isPrivate: false, clerkId: 'user_test_diana_012' },
    { handle: 'eve', displayName: 'Eve Wilson', isPrivate: true, clerkId: 'user_test_eve_345' },
    { handle: 'frank', displayName: 'Frank Miller', isPrivate: false, clerkId: 'user_test_frank_678' },
    { handle: 'grace', displayName: 'Grace Lee', isPrivate: false, clerkId: 'user_test_grace_901' },
    { handle: 'henry', displayName: 'Henry Davis', isPrivate: true, clerkId: 'user_test_henry_234' },
  ];

  for (const userInfo of userData) {
    const user = await prisma.user.upsert({
      where: { handle: userInfo.handle },
      update: {},
      create: {
        handle: userInfo.handle,
        displayName: userInfo.displayName,
        isPrivate: userInfo.isPrivate,
        clerkId: userInfo.clerkId,
      },
    });
    users.push(user);
  }

  const [alice, bob, charlie, diana, eve, frank, grace, henry] = users;
  console.log('✅ Created users:', users.map(u => u.handle).join(', '));

  // Create follower relationships (some mutual, some one-way)
  // Mutual follows (friends):
  // Alice <-> Diana
  // Charlie <-> Frank
  // Grace <-> Henry
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followeeId: diana.id },
      { followerId: diana.id, followeeId: alice.id },
      { followerId: charlie.id, followeeId: frank.id },
      { followerId: frank.id, followeeId: charlie.id },
      { followerId: grace.id, followeeId: henry.id },
      { followerId: henry.id, followeeId: grace.id },
    ],
    skipDuplicates: true,
  });

  // One-way follows:
  // Alice -> Bob
  // Bob -> Charlie
  // Diana -> Eve
  // Frank -> Grace
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followeeId: bob.id },
      { followerId: bob.id, followeeId: charlie.id },
      { followerId: diana.id, followeeId: eve.id },
      { followerId: frank.id, followeeId: grace.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created follow relationships');

  // Create blocks (2-3 block relationships)
  await prisma.block.createMany({
    data: [
      { blockerId: bob.id, blockedId: charlie.id },
      { blockerId: eve.id, blockedId: frank.id },
      { blockerId: henry.id, blockedId: alice.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created block relationships');

  // Create follow requests (for private accounts)
  // Diana requests to follow Eve (private)
  // Frank requests to follow Henry (private)
  // Note: Using individual creates since composite keys don't work well with createMany
  // Create follow requests (for private accounts)
  // Diana requests to follow Eve (private)
  // Frank requests to follow Henry (private)
  // Using create with catch to handle duplicates
  try {
    await prisma.followRequest.create({
      data: {
        followerId: diana.id,
        followeeId: eve.id,
        status: 'PENDING',
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.followRequest.create({
      data: {
        followerId: frank.id,
        followeeId: henry.id,
        status: 'PENDING',
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  // One accepted request
  try {
    await prisma.followRequest.create({
      data: {
        followerId: grace.id,
        followeeId: eve.id,
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  console.log('✅ Created follow requests');

  // Create Public polls (3-4)
  const publicPoll1 = await prisma.poll.create({
    data: {
      ownerId: alice.id,
      question: 'What\'s your favorite programming language?',
      isContinuous: false,
      selectionType: 'SINGLE',
      visibility: 'PUBLIC',
      options: {
        create: [
          { text: 'JavaScript', position: 1 },
          { text: 'TypeScript', position: 2 },
          { text: 'Python', position: 3 },
          { text: 'Rust', position: 4 },
        ],
      },
    },
    include: { options: true },
  });

  const publicPoll2 = await prisma.poll.create({
    data: {
      ownerId: diana.id,
      question: 'Which framework do you prefer?',
      isContinuous: false,
      selectionType: 'SINGLE',
      visibility: 'PUBLIC',
      options: {
        create: [
          { text: 'React', position: 1 },
          { text: 'Vue', position: 2 },
          { text: 'Angular', position: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const publicPoll3 = await prisma.poll.create({
    data: {
      ownerId: charlie.id,
      question: 'How many hours do you code per day?',
      isContinuous: true,
      minValue: 0,
      maxValue: 12,
      step: 0.5,
      visibility: 'PUBLIC',
    },
  });

  const publicPoll4 = await prisma.poll.create({
    data: {
      ownerId: grace.id,
      question: 'What\'s your favorite database?',
      isContinuous: false,
      selectionType: 'MULTIPLE',
      maxSelections: 2,
      visibility: 'PUBLIC',
      options: {
        create: [
          { text: 'PostgreSQL', position: 1 },
          { text: 'MySQL', position: 2 },
          { text: 'MongoDB', position: 3 },
          { text: 'Redis', position: 4 },
        ],
      },
    },
    include: { options: true },
  });

  console.log('✅ Created public polls');

  // Create Friends-only polls (2-3)
  const friendsPoll1 = await prisma.poll.create({
    data: {
      ownerId: alice.id,
      question: 'What should we build next? (Friends only)',
      isContinuous: false,
      selectionType: 'SINGLE',
      visibility: 'FRIENDS_ONLY',
      options: {
        create: [
          { text: 'Mobile app', position: 1 },
          { text: 'Web app', position: 2 },
          { text: 'API', position: 3 },
        ],
      },
    },
    include: { options: true },
  });

  const friendsPoll2 = await prisma.poll.create({
    data: {
      ownerId: charlie.id,
      question: 'Rate our team collaboration (1-10)',
      isContinuous: true,
      minValue: 1,
      maxValue: 10,
      step: 1,
      visibility: 'FRIENDS_ONLY',
    },
  });

  const friendsPoll3 = await prisma.poll.create({
    data: {
      ownerId: grace.id,
      question: 'Which project should we prioritize?',
      isContinuous: false,
      selectionType: 'SINGLE',
      visibility: 'FRIENDS_ONLY',
      options: {
        create: [
          { text: 'Feature A', position: 1 },
          { text: 'Feature B', position: 2 },
          { text: 'Feature C', position: 3 },
        ],
      },
    },
    include: { options: true },
  });

  console.log('✅ Created friends-only polls');

  // Create Private link polls (1-2 with privateLinkToken)
  const privateLinkPoll1 = await prisma.poll.create({
    data: {
      ownerId: bob.id,
      question: 'Secret poll - what do you think?',
      isContinuous: false,
      selectionType: 'SINGLE',
      visibility: 'PRIVATE_LINK',
      privateLinkToken: generatePrivateLinkToken(),
      options: {
        create: [
          { text: 'Option A', position: 1 },
          { text: 'Option B', position: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const privateLinkPoll2 = await prisma.poll.create({
    data: {
      ownerId: eve.id,
      question: 'Confidential survey',
      isContinuous: true,
      minValue: 0,
      maxValue: 100,
      step: 1,
      visibility: 'PRIVATE_LINK',
      privateLinkToken: generatePrivateLinkToken(),
    },
  });

  console.log('✅ Created private link polls');

  // Create votes for discrete polls (include "not voted yet" cases)
  // Public poll 1: Bob and Charlie voted, but Diana and Frank haven't
  await prisma.vote.createMany({
    data: [
      { pollId: publicPoll1.id, voterId: bob.id, optionId: publicPoll1.options[1].id }, // TypeScript
      { pollId: publicPoll1.id, voterId: charlie.id, optionId: publicPoll1.options[2].id }, // Python
    ],
    skipDuplicates: true,
  });

  // Public poll 2: Alice and Frank voted
  await prisma.vote.createMany({
    data: [
      { pollId: publicPoll2.id, voterId: alice.id, optionId: publicPoll2.options[0].id }, // React
      { pollId: publicPoll2.id, voterId: frank.id, optionId: publicPoll2.options[1].id }, // Vue
    ],
    skipDuplicates: true,
  });

  // Friends poll 1: Only Diana can vote (mutual friend with Alice)
  await prisma.vote.create({
    data: {
      pollId: friendsPoll1.id,
      voterId: diana.id,
      optionId: friendsPoll1.options[0].id,
    },
  });

  // Private link poll 1: Bob votes on his own poll
  await prisma.vote.create({
    data: {
      pollId: privateLinkPoll1.id,
      voterId: bob.id,
      optionId: privateLinkPoll1.options[0].id,
    },
  });

  console.log('✅ Created votes for discrete polls');

  // Create slider responses for continuous polls
  await prisma.sliderResponse.createMany({
    data: [
      { pollId: publicPoll3.id, userId: alice.id, value: 8.5 },
      { pollId: publicPoll3.id, userId: bob.id, value: 6.0 },
      { pollId: publicPoll3.id, userId: diana.id, value: 7.5 },
      // Charlie and Frank haven't voted yet
      { pollId: friendsPoll2.id, userId: frank.id, value: 9.0 }, // Frank is mutual friend with Charlie
      { pollId: privateLinkPoll2.id, userId: eve.id, value: 75.0 },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created slider responses for continuous polls');

  // Create a mute relationship
  await prisma.mute.upsert({
    where: {
      muterId_mutedId: {
        muterId: charlie.id,
        mutedId: bob.id,
      },
    },
    update: {},
    create: {
      muterId: charlie.id,
      mutedId: bob.id,
    },
  });

  console.log('✅ Created mute relationship: Charlie muted Bob');

  // Skip some polls
  await prisma.skippedPoll.createMany({
    data: [
      { userId: charlie.id, pollId: publicPoll3.id },
      { userId: frank.id, pollId: friendsPoll2.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created skipped poll records');

  console.log('🎉 Database seeded successfully!');
  console.log(`\n📊 Summary:
  - Users: ${users.length} (${users.filter(u => u.isPrivate).length} private, ${users.filter(u => !u.isPrivate).length} public)
  - Public polls: 4
  - Friends-only polls: 3
  - Private link polls: 2
  - Total polls: 9
  - Follow relationships: Multiple (mutual and one-way)
  - Blocks: 3
  - Follow requests: 3 (2 pending, 1 accepted)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
