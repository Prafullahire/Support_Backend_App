/**
 * Resets default admin passwords. Run: node scripts/reset-admin-passwords.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);

  const branch = await prisma.branch.findFirst({ where: { code: 'HQ' } });

  await prisma.user.upsert({
    where: { email: 'superadmin@support.com' },
    update: {
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      email: 'superadmin@support.com',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@support.com' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
      branchId: branch?.id,
      isActive: true,
    },
    create: {
      email: 'admin@support.com',
      password: adminPassword,
      firstName: 'Branch',
      lastName: 'Admin',
      role: 'ADMIN',
      branchId: branch?.id,
      isActive: true,
    },
  });

  console.log('Admin passwords reset successfully.');
  console.log('Super Admin: superadmin@support.com / SuperAdmin@123');
  console.log('Branch Admin:  admin@support.com / Admin@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
