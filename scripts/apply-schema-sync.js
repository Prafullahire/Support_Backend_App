/**
 * Syncs Prisma schema to MySQL. Run: node scripts/apply-schema-sync.js
 */
const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: backendDir, stdio: 'inherit', shell: true });
}

try {
  console.log('Step 1: prisma generate');
  run('npx prisma generate');

  console.log('Step 2: prisma db push');
  run('npx prisma db push --accept-data-loss');

  console.log('\nSchema sync complete. Restart backend: npm run start:dev\n');
} catch (error) {
  console.error('\nAutomatic sync failed.');
  console.error('Run SQL manually: prisma/manual-schema-sync.sql in MySQL Workbench');
  console.error('Then run: npx prisma generate\n');
  process.exit(1);
}
