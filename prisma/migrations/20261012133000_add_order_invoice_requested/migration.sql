-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceRequested" BOOLEAN DEFAULT false;
