import { PrismaClient } from '../generated/prisma/index.js';
import 'dotenv/config';

const prisma = new PrismaClient();

async function verifySetup() {
  console.log('🔍 Verifying admin setup...\n');

  const issues = [];
  const warnings = [];

  // Check environment variables
  console.log('📋 Checking environment variables...');

  if (!process.env.CLERK_ADMIN_USER_IDS) {
    issues.push('❌ CLERK_ADMIN_USER_IDS is not set');
    console.log('   ❌ CLERK_ADMIN_USER_IDS: NOT SET');
  } else {
    const adminIds = process.env.CLERK_ADMIN_USER_IDS.split(',').map(id => id.trim());
    console.log('   ✅ CLERK_ADMIN_USER_IDS:', adminIds.join(', '));
    
    if (!adminIds.includes('user_37KbZmLutSLCwx88GzajQm78pi9')) {
      warnings.push('⚠️  Your user ID (user_37KbZmLutSLCwx88GzajQm78pi9) is not in CLERK_ADMIN_USER_IDS');
    }
  }

  if (!process.env.CLERK_SECRET_KEY) {
    issues.push('❌ CLERK_SECRET_KEY is not set');
    console.log('   ❌ CLERK_SECRET_KEY: NOT SET');
  } else {
    console.log('   ✅ CLERK_SECRET_KEY: Set (', process.env.CLERK_SECRET_KEY.substring(0, 20) + '...)');
  }

  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    issues.push('❌ CLERK_PUBLISHABLE_KEY is not set');
    console.log('   ❌ CLERK_PUBLISHABLE_KEY: NOT SET');
  } else {
    console.log('   ✅ CLERK_PUBLISHABLE_KEY: Set (', process.env.CLERK_PUBLISHABLE_KEY.substring(0, 20) + '...)');
  }

  // Check database connection
  console.log('\n🗄️  Checking database connection...');
  try {
    await prisma.$connect();
    console.log('   ✅ Database: Connected');
    
    // Check if we have users
    const userCount = await prisma.user.count();
    console.log('   ✅ Users in database:', userCount);
    
    if (userCount === 0) {
      warnings.push('⚠️  No users in database. Run: npm run seed');
    }

    // Check if admin user exists in database
    const adminUserId = 'user_37KbZmLutSLCwx88GzajQm78pi9';
    const adminUser = await prisma.user.findFirst({
      where: { clerkId: adminUserId },
    });

    if (adminUser) {
      console.log('   ✅ Admin user found in database:', adminUser.handle);
    } else {
      warnings.push(`⚠️  User with clerkId "${adminUserId}" not found in database.`);
      warnings.push('   This is OK if you haven\'t signed in yet - Clerk will create the user automatically.');
    }

    // Show some test data
    const polls = await prisma.poll.count();
    const votes = await prisma.vote.count();
    const responses = await prisma.sliderResponse.count();
    
    console.log('\n📊 Database stats:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Polls: ${polls}`);
    console.log(`   Votes: ${votes}`);
    console.log(`   Slider Responses: ${responses}`);

  } catch (error) {
    issues.push('❌ Database connection failed: ' + error.message);
    console.log('   ❌ Database: Connection failed');
    console.log('   Error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! You\'re ready to test admin functionality.');
  } else {
    if (issues.length > 0) {
      console.log('\n❌ Issues found:');
      issues.forEach(issue => console.log('   ' + issue));
    }
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log('   ' + warning));
    }
  }

  console.log('\n📝 Next steps:');
  console.log('   1. Make sure backend .env has CLERK_ADMIN_USER_IDS=user_37KbZmLutSLCwx88GzajQm78pi9');
  console.log('   2. Create app/admin-ui/.env.local with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  console.log('   3. Start backend: npm run dev');
  console.log('   4. Start admin UI: cd ../admin-ui && npm run dev');
  console.log('   5. Sign in at http://localhost:3000 with your Clerk account');
  console.log('   6. Test admin endpoints or use the UI');

  if (issues.length > 0) {
    process.exit(1);
  }
}

verifySetup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
