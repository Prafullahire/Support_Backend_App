-- Run in MySQL if prisma db push fails after role enum change.
USE support_team_db;

-- Step 1: add SUPER_ADMIN to enum
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN', 'EMPLOYEE', 'OFFICE_BOY', 'SUPER_ADMIN') NOT NULL DEFAULT 'ADMIN';

-- Step 2: migrate old employee accounts to branch admin
UPDATE `User` SET `role` = 'ADMIN' WHERE `role` = 'EMPLOYEE';

-- Step 3: remove EMPLOYEE from enum
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('SUPER_ADMIN', 'ADMIN', 'OFFICE_BOY') NOT NULL DEFAULT 'ADMIN';
