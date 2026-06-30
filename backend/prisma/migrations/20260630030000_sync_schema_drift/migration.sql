-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'URGENT');

-- AlterEnum
ALTER TYPE "MemberStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "MemberStatus" ADD VALUE 'PENDING_CREDENTIALS';

-- AlterEnum
ALTER TYPE "WithdrawalStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "subscription_groups" ADD COLUMN     "credentials" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
