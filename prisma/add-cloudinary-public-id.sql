-- Migration: Add cloudinaryPublicId column to Attachment table
-- Run this in your Supabase SQL Editor or psql

ALTER TABLE "Attachment"
ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT;

COMMENT ON COLUMN "Attachment"."cloudinaryPublicId" IS 'Cloudinary public_id used for file deletion';
