-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SENT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Order" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Order" ADD COLUMN "taxOffice" TEXT;
ALTER TABLE "Order" ADD COLUMN "taxNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "billingAddress" JSONB;
ALTER TABLE "Order" ADD COLUMN "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
