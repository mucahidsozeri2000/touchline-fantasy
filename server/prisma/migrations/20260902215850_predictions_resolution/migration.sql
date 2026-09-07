-- AlterTable
ALTER TABLE "FixturePick" ADD COLUMN     "correct" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "bonusPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topScorerCorrect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topScorerResolved" BOOLEAN NOT NULL DEFAULT false;
