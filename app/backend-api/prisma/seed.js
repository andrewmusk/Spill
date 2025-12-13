import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const alice = await prisma.user.upsert({
    where: { handle: 'alice' },
    update: {},
    create: {
      handle: 'alice',
      displayName: 'Alice Smith',
      isPrivate: false,
    },
  });

  const bob = await prisma.user.upsert({
    where: { handle: 'bob' },
    update: {},
    create: {
      handle: 'bob',
      displayName: 'Bob Johnson',
      isPrivate: true,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { handle: 'charlie' },
    update: {},
    create: {
      handle: 'charlie',
      displayName: 'Charlie Brown',
      isPrivate: false,
    },
  });

  console.log('✅ Created users:', { alice: alice.handle, bob: bob.handle, charlie: charlie.handle });

  // Create a follow relationship
  await prisma.follow.upsert({
    where: {
      followerId_followeeId: {
        followerId: alice.id,
        followeeId: bob.id,
      },
    },
    update: {},
    create: {
      followerId: alice.id,
      followeeId: bob.id,
    },
  });

  console.log('✅ Created follow relationship: Alice follows Bob');

  // Create a discrete poll
  const discretePoll = await prisma.poll.create({
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
    include: {
      options: true,
    },
  });

  console.log('✅ Created discrete poll:', discretePoll.question);

  // Create votes for the discrete poll
  await prisma.vote.create({
    data: {
      pollId: discretePoll.id,
      voterId: bob.id,
      optionId: discretePoll.options[1].id, // TypeScript
    },
  });

  await prisma.vote.create({
    data: {
      pollId: discretePoll.id,
      voterId: charlie.id,
      optionId: discretePoll.options[2].id, // Python
    },
  });

  console.log('✅ Created votes for discrete poll');

  // Create a continuous poll
  const continuousPoll = await prisma.poll.create({
    data: {
      ownerId: bob.id,
      question: 'How much do you enjoy coding? (1-10 scale)',
      isContinuous: true,
      minValue: 1.0,
      maxValue: 10.0,
      step: 0.5,
      visibility: 'FOLLOWERS',
    },
  });

  console.log('✅ Created continuous poll:', continuousPoll.question);

  // Create slider responses for the continuous poll
  await prisma.sliderResponse.create({
    data: {
      pollId: continuousPoll.id,
      userId: alice.id,
      value: 9.5,
    },
  });

  console.log('✅ Created slider response for continuous poll');

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

  // Skip a poll
  await prisma.skippedPoll.create({
    data: {
      userId: charlie.id,
      pollId: continuousPoll.id,
    },
  });

  console.log('✅ Created skipped poll record');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 