-- AlterTable
ALTER TABLE "riders" ADD COLUMN     "zoneId" TEXT;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
