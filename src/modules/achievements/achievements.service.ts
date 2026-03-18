import { AchievementMetric, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AchievementSeed = {
  code: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  threshold: number;
};

const defaultAchievementDefinitions: AchievementSeed[] = [
  {
    code: "habit_streak_3",
    title: "Consistency Begins",
    description: "Reach a 3-day habit streak",
    metric: "longest_habit_streak",
    threshold: 3,
  },
  {
    code: "habit_streak_7",
    title: "Week Warrior",
    description: "Reach a 7-day habit streak",
    metric: "longest_habit_streak",
    threshold: 7,
  },
  {
    code: "tasks_10",
    title: "Task Tactician",
    description: "Complete 10 tasks",
    metric: "total_task_completions",
    threshold: 10,
  },
  {
    code: "xp_100",
    title: "Level Up",
    description: "Earn 100 XP",
    metric: "total_xp",
    threshold: 100,
  },
];

export async function seedAchievementDefinitions() {
  await Promise.all(
    defaultAchievementDefinitions.map((definition) =>
      prisma.achievementDefinition.upsert({
        where: { code: definition.code },
        create: definition,
        update: {
          title: definition.title,
          description: definition.description,
          metric: definition.metric,
          threshold: definition.threshold,
          active: true,
        },
      }),
    ),
  );
}

async function getAchievementMetrics(tx: Prisma.TransactionClient, userId: string) {
  const [longestStreakAggregate, habitCompletionCount, taskCompletionCount, xpAggregate] =
    await Promise.all([
      tx.habitStreak.aggregate({
        where: { userId },
        _max: { longestStreak: true },
      }),
      tx.habitCompletion.count({ where: { userId } }),
      tx.xpLedgerEntry.count({
        where: {
          userId,
          source: "task_completion",
          amount: { gt: 0 },
        },
      }),
      tx.xpLedgerEntry.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

  return {
    longest_habit_streak: longestStreakAggregate._max.longestStreak ?? 0,
    total_habit_completions: habitCompletionCount,
    total_task_completions: taskCompletionCount,
    total_xp: Math.max(0, xpAggregate._sum.amount ?? 0),
  };
}

export async function evaluateAchievementsTx(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const [definitions, existingUnlocks, metrics] = await Promise.all([
    tx.achievementDefinition.findMany({ where: { active: true } }),
    tx.userAchievement.findMany({
      where: { userId },
      select: { achievementDefinitionId: true },
    }),
    getAchievementMetrics(tx, userId),
  ]);

  const existingSet = new Set(existingUnlocks.map((row) => row.achievementDefinitionId));
  const unlockedIds: string[] = [];

  for (const definition of definitions) {
    if (existingSet.has(definition.id)) continue;

    const currentValue = metrics[definition.metric];
    if (currentValue < definition.threshold) continue;

    await tx.userAchievement.create({
      data: {
        userId,
        achievementDefinitionId: definition.id,
      },
    });

    unlockedIds.push(definition.id);
    existingSet.add(definition.id);
  }

  if (unlockedIds.length === 0) return [];

  return tx.achievementDefinition.findMany({
    where: { id: { in: unlockedIds } },
    orderBy: { threshold: "asc" },
  });
}

export async function listAchievements(userId: string) {
  await seedAchievementDefinitions();

  const definitions = await prisma.achievementDefinition.findMany({
    where: { active: true },
    orderBy: [{ metric: "asc" }, { threshold: "asc" }],
  });

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: {
      achievementDefinitionId: true,
      unlockedAt: true,
    },
  });

  const unlockedById = new Map(
    unlocked.map((item) => [item.achievementDefinitionId, item.unlockedAt]),
  );

  return definitions.map((definition) => ({
    id: definition.id,
    code: definition.code,
    title: definition.title,
    description: definition.description,
    metric: definition.metric,
    threshold: definition.threshold,
    unlocked: unlockedById.has(definition.id),
    unlockedAt: unlockedById.get(definition.id)?.toISOString() ?? null,
  }));
}
