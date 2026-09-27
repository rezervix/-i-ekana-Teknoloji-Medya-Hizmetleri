-- Add companyTitle column to User table
-- This migration adds the missing companyTitle column to fix the P2022 error
-- The column is nullable to ensure existing users are not affected

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyTitle" TEXT;
