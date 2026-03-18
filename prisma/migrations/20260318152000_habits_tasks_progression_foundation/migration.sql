-- CreateEnum
CREATE TYPE "public"."HabitFrequency" AS ENUM ('daily');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('open', 'completed');

-- CreateEnum
CREATE TYPE "public"."XpSource" AS ENUM ('habit_completion', 'task_completion', 'achievement_unlock', 'adjustment');

-- CreateEnum
CREATE TYPE "public"."AchievementMetric" AS ENUM ('longest_habit_streak', 'total_habit_completions', 'total_task_completions', 'total_xp');

-- CreateTable
CREATE TABLE "public"."Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "timezone" TEXT,
    "frequency" "public"."HabitFrequency" NOT NULL DEFAULT 'daily',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HabitCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HabitStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedLocalDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'open',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressionProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevelXp" INTEGER NOT NULL DEFAULT 0,
    "nextLevelXp" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."XpLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "public"."XpSource" NOT NULL,
    "referenceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AchievementDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" "public"."AchievementMetric" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementDefinitionId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_userId_isArchived_idx" ON "public"."Habit"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCompletion_userId_habitId_localDate_key" ON "public"."HabitCompletion"("userId", "habitId", "localDate");

-- CreateIndex
CREATE INDEX "HabitCompletion_userId_localDate_idx" ON "public"."HabitCompletion"("userId", "localDate");

-- CreateIndex
CREATE INDEX "HabitCompletion_habitId_completedAt_idx" ON "public"."HabitCompletion"("habitId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HabitStreak_habitId_key" ON "public"."HabitStreak"("habitId");

-- CreateIndex
CREATE INDEX "HabitStreak_userId_idx" ON "public"."HabitStreak"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "public"."Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_dueAt_idx" ON "public"."Task"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionProfile_userId_key" ON "public"."ProgressionProfile"("userId");

-- CreateIndex
CREATE INDEX "XpLedgerEntry_userId_createdAt_idx" ON "public"."XpLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpLedgerEntry_userId_source_idx" ON "public"."XpLedgerEntry"("userId", "source");

-- CreateIndex
CREATE INDEX "XpLedgerEntry_source_referenceId_idx" ON "public"."XpLedgerEntry"("source", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementDefinition_code_key" ON "public"."AchievementDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementDefinitionId_key" ON "public"."UserAchievement"("userId", "achievementDefinitionId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlockedAt_idx" ON "public"."UserAchievement"("userId", "unlockedAt");

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitCompletion" ADD CONSTRAINT "HabitCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitCompletion" ADD CONSTRAINT "HabitCompletion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitStreak" ADD CONSTRAINT "HabitStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitStreak" ADD CONSTRAINT "HabitStreak_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressionProfile" ADD CONSTRAINT "ProgressionProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."XpLedgerEntry" ADD CONSTRAINT "XpLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_achievementDefinitionId_fkey" FOREIGN KEY ("achievementDefinitionId") REFERENCES "public"."AchievementDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SeedAchievementDefinitions
INSERT INTO "public"."AchievementDefinition" ("id", "code", "title", "description", "metric", "threshold", "active", "createdAt", "updatedAt")
VALUES
  ('achv_habit_streak_3', 'habit_streak_3', 'Consistency Begins', 'Reach a 3-day habit streak', 'longest_habit_streak', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achv_habit_streak_7', 'habit_streak_7', 'Week Warrior', 'Reach a 7-day habit streak', 'longest_habit_streak', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achv_tasks_10', 'tasks_10', 'Task Tactician', 'Complete 10 tasks', 'total_task_completions', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achv_xp_100', 'xp_100', 'Level Up', 'Earn 100 XP', 'total_xp', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "metric" = EXCLUDED."metric",
  "threshold" = EXCLUDED."threshold",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
