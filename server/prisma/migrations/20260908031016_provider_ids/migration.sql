-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "statsIngestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Club_externalId_key" ON "Club"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_externalId_key" ON "Fixture"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_externalId_key" ON "Player"("externalId");

