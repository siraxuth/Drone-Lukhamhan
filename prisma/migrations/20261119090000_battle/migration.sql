CREATE TABLE "BattleRoom" (
    "code" TEXT PRIMARY KEY,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "BattleFlight" (
    "id" TEXT PRIMARY KEY,
    "roomCode" TEXT NOT NULL REFERENCES "BattleRoom"("code") ON DELETE CASCADE ON UPDATE CASCADE,
    "tape" JSONB NOT NULL
);
CREATE INDEX "BattleFlight_roomCode_idx" ON "BattleFlight"("roomCode");
CREATE TABLE "BattleRating" (
    "userId" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "games" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "BattleRating_rating_idx" ON "BattleRating"("rating");
CREATE TABLE "BattleRatingGame" (
    "id" TEXT PRIMARY KEY,
    "players" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
