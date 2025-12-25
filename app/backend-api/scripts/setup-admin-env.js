import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_USER_ID = 'user_37KbZmLutSLCwx88GzajQm78pi9';
const ENV_FILE = path.join(__dirname, '..', '.env');

function setupAdminEnv() {
  console.log('🔧 Setting up admin environment...\n');

  // Check if .env file exists
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ .env file not found at:', ENV_FILE);
    console.log('   Please create it first with your database and Clerk configuration.');
    process.exit(1);
  }

  // Read existing .env file
  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = envContent.split('\n');

  // Check if CLERK_ADMIN_USER_IDS already exists
  const adminLineIndex = lines.findIndex(line => 
    line.startsWith('CLERK_ADMIN_USER_IDS=') || line.startsWith('# CLERK_ADMIN_USER_IDS=')
  );

  if (adminLineIndex !== -1) {
    // Update existing line
    const existingLine = lines[adminLineIndex];
    if (existingLine.includes(ADMIN_USER_ID)) {
      console.log('✅ CLERK_ADMIN_USER_IDS already includes your user ID');
      console.log('   Current value:', existingLine);
      return;
    }

    // Check if it's commented out
    if (existingLine.startsWith('#')) {
      // Uncomment and update
      lines[adminLineIndex] = `CLERK_ADMIN_USER_IDS=${ADMIN_USER_ID}`;
      console.log('✅ Uncommented and updated CLERK_ADMIN_USER_IDS');
    } else {
      // Append to existing (comma-separated)
      const existingValue = existingLine.split('=')[1]?.trim() || '';
      const newValue = existingValue 
        ? `${existingValue},${ADMIN_USER_ID}`
        : ADMIN_USER_ID;
      lines[adminLineIndex] = `CLERK_ADMIN_USER_IDS=${newValue}`;
      console.log('✅ Added your user ID to existing CLERK_ADMIN_USER_IDS');
    }
  } else {
    // Add new line
    console.log('➕ Adding CLERK_ADMIN_USER_IDS to .env file...');
    lines.push(''); // Empty line before
    lines.push(`# Admin Access`);
    lines.push(`CLERK_ADMIN_USER_IDS=${ADMIN_USER_ID}`);
  }

  // Write back to file
  envContent = lines.join('\n');
  fs.writeFileSync(ENV_FILE, envContent, 'utf8');

  console.log('\n✅ Successfully updated .env file!');
  console.log(`   CLERK_ADMIN_USER_IDS=${ADMIN_USER_ID}`);
  console.log('\n⚠️  Remember to restart your backend server for changes to take effect.');
  console.log('   Run: npm run dev');
}

setupAdminEnv();
