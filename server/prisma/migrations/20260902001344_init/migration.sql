-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "coachName" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "captainPlayerId" TEXT,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "bonusGwPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    CONSTRAINT "Manager_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "form" REAL NOT NULL,
    "photoUrl" TEXT,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT,
    "isBench" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Player_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Player_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Manager" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "DraftEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DraftEvent_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DraftEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "opensAt" DATETIME NOT NULL,
    "closesAt" DATETIME NOT NULL,
    "phaseOverride" TEXT,
    "autoAssignDone" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TransferWindow_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "gameweek" INTEGER NOT NULL,
    "homeClub" TEXT NOT NULL,
    "awayClub" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "kickoffAt" DATETIME NOT NULL,
    CONSTRAINT "Fixture_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerMatchStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "cleanSheet" BOOLEAN NOT NULL DEFAULT false,
    "yellow" INTEGER NOT NULL DEFAULT 0,
    "red" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerMatchStat_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerMatchStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_token_key" ON "Manager"("token");

-- CreateIndex
CREATE INDEX "Manager_leagueId_idx" ON "Manager"("leagueId");

-- CreateIndex
CREATE INDEX "Player_leagueId_idx" ON "Player"("leagueId");

-- CreateIndex
CREATE INDEX "Player_ownerId_idx" ON "Player"("ownerId");

-- CreateIndex
CREATE INDEX "DraftEvent_leagueId_createdAt_idx" ON "DraftEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransferWindow_leagueId_key" ON "TransferWindow"("leagueId");

-- CreateIndex
CREATE INDEX "Fixture_leagueId_gameweek_idx" ON "Fixture"("leagueId", "gameweek");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchStat_fixtureId_playerId_key" ON "PlayerMatchStat"("fixtureId", "playerId");
