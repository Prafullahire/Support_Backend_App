/**
 * Pushes Prisma schema to Supabase PostgreSQL and seeds default data.
 * Run from backend folder: npm run db:setup
 *
 * Prerequisites:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy DATABASE_URL (pooler) and DIRECT_URL (direct) into backend/.env
 * 3. Set Cloudinary keys in backend/.env
 */
const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');

function run(cmd) {
  console.log(`> ${cmd}\n`);
  execSync(cmd, { cwd: backendDir, stdio: 'inherit', shell: true });
}

console.log('Support App — Supabase database setup\n');
console.log('Ensure backend/.env has DATABASE_URL and DIRECT_URL from Supabase.\n');

run('npx prisma generate');
run('npx prisma db push');
run('npm run prisma:seed');

console.log('\nDatabase setup complete.');
console.log('Default logins: superadmin@support.com / SuperAdmin@123, admin@support.com / Admin@123');
