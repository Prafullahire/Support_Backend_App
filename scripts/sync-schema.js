/**
 * Applies latest Prisma schema to the database and regenerates the client.
 * Run: node scripts/sync-schema.js
 * Or:  npm run db:push
 */
const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');

function run(cmd) {
  console.log(`> ${cmd}\n`);
  execSync(cmd, { cwd: backendDir, stdio: 'inherit', shell: true });
}

console.log('Syncing Prisma schema...\n');
run('npx prisma generate');
run('npx prisma db push');
console.log('\nDone. Restart the backend server (npm run start:dev).');
