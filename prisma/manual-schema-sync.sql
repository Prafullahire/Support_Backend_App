-- Run this in MySQL Workbench if "npm run db:push" fails.
-- Database: support_team_db

USE support_team_db;

-- User profile fields
ALTER TABLE `User` ADD COLUMN `leavingDate` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `address` TEXT NULL;

-- Office boy attendance
ALTER TABLE `OfficeBoyAttendance` ADD COLUMN `isLate` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `OfficeBoyAttendance` ADD COLUMN `lateReason` TEXT NULL;
ALTER TABLE `OfficeBoyAttendance` ADD COLUMN `isEarlyLeave` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `OfficeBoyAttendance` ADD COLUMN `earlyLeaveReason` TEXT NULL;
ALTER TABLE `OfficeBoyAttendance` ADD COLUMN `approvedCorrectionType` ENUM('PRESENT_FULL_DAY', 'PRESENT_FULL_DAY_NOT_COMPLETED_9H', 'PRESENT_HALF_DAY', 'ABSENT_INFORMED_SENIOR', 'HOLIDAY') NULL;

CREATE TABLE IF NOT EXISTS `AttendanceCorrectionRequest` (
  `id` VARCHAR(191) NOT NULL,
  `attendanceId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `requestType` ENUM('PRESENT_FULL_DAY', 'PRESENT_FULL_DAY_NOT_COMPLETED_9H', 'PRESENT_HALF_DAY', 'ABSENT_INFORMED_SENIOR', 'HOLIDAY') NOT NULL,
  `comments` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewedById` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `adminNotes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AttendanceCorrectionRequest_attendanceId_idx`(`attendanceId`),
  INDEX `AttendanceCorrectionRequest_userId_idx`(`userId`),
  INDEX `AttendanceCorrectionRequest_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AttendanceCorrectionRequest`
  ADD CONSTRAINT `AttendanceCorrectionRequest_attendanceId_fkey`
  FOREIGN KEY (`attendanceId`) REFERENCES `OfficeBoyAttendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttendanceCorrectionRequest`
  ADD CONSTRAINT `AttendanceCorrectionRequest_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AttendanceCorrectionRequest`
  ADD CONSTRAINT `AttendanceCorrectionRequest_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend enums for attendance corrections
ALTER TABLE `OfficeBoyAttendance` MODIFY COLUMN `status` ENUM(
  'PRESENT',
  'FULL_DAY',
  'HALF_DAY',
  'EARLY_LEAVE',
  'ABSENT',
  'PARTIAL',
  'LATE',
  'INCOMPLETE',
  'REJECTED_LOCATION',
  'HOLIDAY'
) NOT NULL DEFAULT 'INCOMPLETE';

ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM(
  'REQUEST_CREATED',
  'REQUEST_UPDATED',
  'REQUEST_COMPLETED',
  'ASSET_ASSIGNED',
  'COURIER_DELIVERY',
  'LOW_STOCK',
  'CONTRACT_EXPIRY',
  'ACCOMMODATION_EXPIRY',
  'ATTENDANCE_CORRECTION_REQUEST',
  'ATTENDANCE_CORRECTION_APPROVED',
  'ATTENDANCE_CORRECTION_REJECTED',
  'GENERAL'
) NOT NULL DEFAULT 'GENERAL';

-- Forgot password tokens
CREATE TABLE IF NOT EXISTS `PasswordResetToken` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
  INDEX `PasswordResetToken_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PasswordResetToken`
  ADD CONSTRAINT `PasswordResetToken_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
