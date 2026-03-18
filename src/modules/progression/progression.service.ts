import { Prisma, XpSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const HABIT_COMPLETION_XP = 10;
export const TASK_COMPLETION_XP = 25;
export const XP_PER_LEVEL = 100;

type XpGrantInput = {
  userId: string;
  amount: number;
  source: XpSource;
  referenceId?: string;
  metadata?: Prisma.JsonValue;
};

export type ProgressionDTO = {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
};

export function getLocalDateKey(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function deriveProgression(totalXp: number): ProgressionDTO {
  const safeTotalXp = Math.max(0, totalXp);
  const level = Math.floor(safeTotalXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeTotalXp % XP_PER_LEVEL;

  return {
    level,
    totalXp: safeTotalXp,
    currentLevelXp,
    nextLevelXp: XP_PER_LEVEL,
  };
}

export async function syncProgressionProfileTx(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const aggregate = await tx.xpLedgerEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const projection = deriveProgression(aggregate._sum.amount ?? 0);

  return tx.progressionProfile.upsert({
    where: { userId },
    create: {
      userId,
      level: projection.level,
      totalXp: projection.totalXp,
      currentLevelXp: projection.currentLevelXp,
      nextLevelXp: projection.nextLevelXp,
    },
    update: {
      level: projection.level,
      totalXp: projection.totalXp,
      currentLevelXp: projection.currentLevelXp,
      nextLevelXp: projection.nextLevelXp,
    },
  });
}

export async function grantXpTx(tx: Prisma.TransactionClient, input: XpGrantInput) {
  await tx.xpLedgerEntry.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      source: input.source,
      referenceId: input.referenceId,
      metadata: input.metadata ?? {},
    },
  });

  return syncProgressionProfileTx(tx, input.userId);
}

export async function removeXpEntriesForReferenceTx(
  tx: Prisma.TransactionClient,
  input: { userId: string; source: XpSource; referenceId: string },
) {
  await tx.xpLedgerEntry.deleteMany({
    where: {
      userId: input.userId,
      source: input.source,
      referenceId: input.referenceId,
    },
  });

  return syncProgressionProfileTx(tx, input.userId);
}

export async function getProgression(userId: string) {
  const profile = await prisma.progressionProfile.findUnique({ where: { userId } });
  if (profile) {
    return {
      level: profile.level,
      totalXp: profile.totalXp,
      currentLevelXp: profile.currentLevelXp,
      nextLevelXp: profile.nextLevelXp,
    };
  }

  const synced = await prisma.$transaction((tx) => syncProgressionProfileTx(tx, userId));
  return {
    level: synced.level,
    totalXp: synced.totalXp,
    currentLevelXp: synced.currentLevelXp,
    nextLevelXp: synced.nextLevelXp,
  };
}

export async function getTodaySnapshot(userId: string, timezone: string) {
  const day = getLocalDateKey(new Date(), timezone);

  const [habits, habitCompletions, tasks] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: { streak: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.habitCompletion.findMany({
      where: { userId, localDate: day },
      select: { habitId: true },
    }),
    prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const completedHabitIds = new Set(habitCompletions.map((entry) => entry.habitId));

  const habitsForToday = habits.map((habit) => ({
    id: habit.id,
    title: habit.title,
    description: habit.description,
    color: habit.color,
    completedToday: completedHabitIds.has(habit.id),
    streak: {
      current: habit.streak?.currentStreak ?? 0,
      longest: habit.streak?.longestStreak ?? 0,
    },
  }));

  const tasksForToday = tasks
    .map((task) => {
      const dueLocalDate = task.dueAt ? getLocalDateKey(task.dueAt, timezone) : null;
      const completedLocalDate = task.completedAt
        ? getLocalDateKey(task.completedAt, timezone)
        : null;

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        dueToday: dueLocalDate === day,
        completedToday: completedLocalDate === day,
      };
    })
    .filter((task) => task.dueToday || task.completedToday || task.status === "open");

  return {
    date: day,
    timezone,
    habits: habitsForToday,
    tasks: tasksForToday,
  };
}
