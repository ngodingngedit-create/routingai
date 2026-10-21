/*
  Warnings:

  - The `lastRequest` column on the `RateLimit` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "RateLimit" DROP COLUMN "lastRequest",
ADD COLUMN     "lastRequest" BIGINT NOT NULL DEFAULT 0;
