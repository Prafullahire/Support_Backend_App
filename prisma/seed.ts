import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);

  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: {
      name: 'Head Office',
      code: 'HQ',
      address: 'Main Street',
      city: 'Mumbai',
    },
  });

  const department = await prisma.department.upsert({
    where: { id: 'seed-dept-it' },
    update: {},
    create: {
      id: 'seed-dept-it',
      name: 'IT Support',
      branchId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'superadmin@support.com' },
    update: { role: UserRole.SUPER_ADMIN, password: superAdminPassword, isActive: true },
    create: {
      email: 'superadmin@support.com',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@support.com' },
    update: {
      role: UserRole.ADMIN,
      branchId: branch.id,
      password: adminPassword,
      isActive: true,
    },
    create: {
      email: 'admin@support.com',
      password: adminPassword,
      firstName: 'Branch',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      branchId: branch.id,
      departmentId: department.id,
    },
  });

  const hqOfficeLocation = await prisma.officeLocation.upsert({
    where: { id: 'seed-office-hq' },
    update: {},
    create: {
      id: 'seed-office-hq',
      name: 'Mumbai HQ Office',
      branchId: branch.id,
      latitude: 19.076,
      longitude: 72.8777,
      allowedRadiusMeters: 2000,
      isActive: true,
    },
  });

  const categories = ['Laptop', 'Mobile', 'Monitor', 'Accessories'];
  for (const name of categories) {
    await prisma.assetCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const expenseCategories = ['Travel', 'Office Supplies', 'Maintenance', 'Utilities'];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const entities = [
    { code: 'NEOSOFT_PVT', name: 'Neosoft Pvt. Ltd.' },
    { code: 'NEOSOFT_TECH', name: 'Neosoft Technology' },
    { code: 'NEOSOFT_DIGITAL', name: 'Neosoft Digital' },
    { code: 'DECIX', name: 'Decix Interwire' },
  ];
  for (const entity of entities) {
    await prisma.entity.upsert({
      where: { code: entity.code },
      update: { name: entity.name },
      create: entity,
    });
  }

  await prisma.vendor.upsert({
    where: { id: 'seed-vendor-courier' },
    update: {},
    create: {
      id: 'seed-vendor-courier',
      name: 'BlueDart Express',
      contact: 'Courier Desk',
      email: 'support@bluedart.example',
      phone: '1800-000-000',
    },
  });

  const kitItems = ['Laptop Bag', 'Mouse', 'Notebook', 'Pen Set', 'ID Holder'];
  for (const name of kitItems) {
    const item = await prisma.joiningKitItem.upsert({
      where: { id: `seed-kit-${name.toLowerCase().replace(/\s/g, '-')}` },
      update: {},
      create: {
        id: `seed-kit-${name.toLowerCase().replace(/\s/g, '-')}`,
        name,
        description: `${name} for new joiners`,
      },
    });

    await prisma.joiningKitStock.upsert({
      where: { itemId_branchId: { itemId: item.id, branchId: branch.id } },
      update: {},
      create: {
        itemId: item.id,
        branchId: branch.id,
        quantity: 50,
        minStock: 10,
      },
    });
  }

  console.log('Seed completed successfully');
  console.log('Admin: admin@support.com / Admin@123');
  console.log('Employee: employee@support.com / Employee@123');
  console.log(`HQ Office Location: ${hqOfficeLocation.name}`);

  const puneBranch = await prisma.branch.upsert({
    where: { code: 'PUNE' },
    update: {},
    create: {
      name: 'Pune Office',
      code: 'PUNE',
      address: 'Hinjewadi Phase 1',
      city: 'Pune',
    },
  });

  const officeLocation = await prisma.officeLocation.upsert({
    where: { id: 'seed-office-pune' },
    update: {},
    create: {
      id: 'seed-office-pune',
      name: 'Pune Main Office',
      branchId: puneBranch.id,
      latitude: 18.5204,
      longitude: 73.8567,
      allowedRadiusMeters: 500,
      isActive: true,
    },
  });

  const officeBoyPassword = await bcrypt.hash('OfficeBoy@123', 10);
  await prisma.user.upsert({
    where: { email: 'officeboy@support.com' },
    update: {},
    create: {
      email: 'officeboy@support.com',
      password: officeBoyPassword,
      firstName: 'Rahul',
      lastName: 'Sharma',
      employeeId: 'OB-001',
      phone: '9876543210',
      role: UserRole.OFFICE_BOY,
      branchId: puneBranch.id,
      officeLocationId: officeLocation.id,
      joiningDate: new Date('2025-01-01'),
      isActive: true,
    },
  });

  console.log('Office Boy: officeboy@support.com / OfficeBoy@123 (Employee ID: OB-001)');
  console.log('Office Location: Pune Main Office (lat: 18.5204, lng: 73.8567, radius: 500m)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
