import { Prisma, XpSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateAchievementsTx, seedAchievementDefinitions } from "@/modules/achievements/achievements.service";
import {
  getLocalDateKey,
  grantXpTx,
  HABIT_COMPLETION_XP,
  removeXpEntriesForReferenceTx,
  TASK_COMPLETION_XP,
} from "@/modules/progression/progression.service";
import { recomputeHabitStreakTx } from "@/modules/streaks/streaks.service";
import { toTaskDTO } from "@/modules/tasks/tasks.service";

type DomainErrorCode =
  | "HABIT_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "HABIT_ALREADY_COMPLETED"
  | "HABIT_COMPLETION_NOT_FOUND";

export class DomainError extends Error {
  status: number;
  code: DomainErrorCode;

  constructor(status: number, code: DomainErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function resolveTimezone(input: string | undefined, fallback: string | null | undefined) {
  return input ?? fallback ?? "UTC";
}

function isUniqueConstraintError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }

  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code === "P2002"
    : false;
}

export async function completeHabit(
  userId: string,
  habitId: string,
  input: { timezone?: string; localDate?: string } = {},
) {
  await seedAchievementDefinitions();

  return prisma.$transaction(async (tx) => {
    const [habit, user] = await Promise.all([
      tx.habit.findFirst({
        where: { id: habitId, userId, isArchived: false },
      }),
      tx.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      }),
    ]);

    if (!habit) {
      throw new DomainError(404, "HABIT_NOT_FOUND", "habit not found");
    }

    const timezone = resolveTimezone(input.timezone, habit.timezone ?? user?.timezone);
    const localDate = input.localDate ?? getLocalDateKey(new Date(), timezone);

    let completion;
    try {
      completion = await tx.habitCompletion.create({
        data: {
          userId,
          habitId,
          timezone,
          localDate,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DomainError(
          409,
          "HABIT_ALREADY_COMPLETED",
          "habit already completed for this local day",
        );
      }

      throw error;
    }

    const [streak, progression, unlockedAchievements] = await Promise.all([
      recomputeHabitStreakTx(tx, userId, habitId),
      grantXpTx(tx, {
        userId,
        amount: HABIT_COMPLETION_XP,
        source: "habit_completion",
        referenceId: completion.id,
        metadata: { habitId, localDate },
      }),
      evaluateAchievementsTx(tx, userId),
    ]);

    return {
      habitId,
      completion: {
        id: completion.id,
        localDate: completion.localDate,
        timezone: completion.timezone,
        completedAt: completion.completedAt.toISOString(),
      },
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastCompletedLocalDate: streak.lastCompletedLocalDate,
      },
      progression: {
        level: progression.level,
        totalXp: progression.totalXp,
        currentLevelXp: progression.currentLevelXp,
        nextLevelXp: progression.nextLevelXp,
      },
      unlockedAchievements: unlockedAchievements.map((achievement) => ({
        id: achievement.id,
        code: achievement.code,
        title: achievement.title,
      })),
    };
  });
}

export async function uncompleteHabit(
  userId: string,
  habitId: string,
  input: { timezone?: string; localDate?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const [habit, user] = await Promise.all([
      tx.habit.findFirst({ where: { id: habitId, userId } }),
      tx.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      }),
    ]);

    if (!habit) {
      throw new DomainError(404, "HABIT_NOT_FOUND", "habit not found");
    }

    const timezone = resolveTimezone(input.timezone, habit.timezone ?? user?.timezone);
    const localDate = input.localDate ?? getLocalDateKey(new Date(), timezone);

    const completion = await tx.habitCompletion.findUnique({
      where: {
        userId_habitId_localDate: {
          userId,
          habitId,
          localDate,
        },
      },
    });

    if (!completion) {
      throw new DomainError(404, "HABIT_COMPLETION_NOT_FOUND", "habit completion not found");
    }

    await tx.habitCompletion.delete({ where: { id: completion.id } });

    const [streak, progression] = await Promise.all([
      recomputeHabitStreakTx(tx, userId, habitId),
      removeXpEntriesForReferenceTx(tx, {
        userId,
        source: "habit_completion",
        referenceId: completion.id,
      }),
    ]);

    return {
      habitId,
      removedLocalDate: localDate,
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastCompletedLocalDate: streak.lastCompletedLocalDate,
      },
      progression: {
        level: progression.level,
        totalXp: progression.totalXp,
        currentLevelXp: progression.currentLevelXp,
        nextLevelXp: progression.nextLevelXp,
      },
    };
  });
}

export async function completeTask(userId: string, taskId: string) {
  await seedAchievementDefinitions();

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      throw new DomainError(404, "TASK_NOT_FOUND", "task not found");
    }

    if (task.status === "completed") {
      const progression = await tx.progressionProfile.findUnique({ where: { userId } });
      return {
        task: toTaskDTO(task),
        progression: {
          level: progression?.level ?? 1,
          totalXp: progression?.totalXp ?? 0,
          currentLevelXp: progression?.currentLevelXp ?? 0,
          nextLevelXp: progression?.nextLevelXp ?? 100,
        },
        unlockedAchievements: [],
        grantedXp: 0,
      };
    }

    const completedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    const [progression, unlockedAchievements] = await Promise.all([
      grantXpTx(tx, {
        userId,
        amount: TASK_COMPLETION_XP,
        source: "task_completion",
        referenceId: task.id,
        metadata: { taskId: task.id },
      }),
      evaluateAchievementsTx(tx, userId),
    ]);

    return {
      task: toTaskDTO(completedTask),
      progression: {
        level: progression.level,
        totalXp: progression.totalXp,
        currentLevelXp: progression.currentLevelXp,
        nextLevelXp: progression.nextLevelXp,
      },
      unlockedAchievements: unlockedAchievements.map((achievement) => ({
        id: achievement.id,
        code: achievement.code,
        title: achievement.title,
      })),
      grantedXp: TASK_COMPLETION_XP,
    };
  });
}

export async function reopenTask(userId: string, taskId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      throw new DomainError(404, "TASK_NOT_FOUND", "task not found");
    }

    if (task.status === "open") {
      const progression = await tx.progressionProfile.findUnique({ where: { userId } });
      return {
        task: toTaskDTO(task),
        progression: {
          level: progression?.level ?? 1,
          totalXp: progression?.totalXp ?? 0,
          currentLevelXp: progression?.currentLevelXp ?? 0,
          nextLevelXp: progression?.nextLevelXp ?? 100,
        },
      };
    }

    const reopenedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        status: "open",
        completedAt: null,
      },
    });

    const progression = await removeXpEntriesForReferenceTx(tx, {
      userId,
      source: XpSource.task_completion,
      referenceId: task.id,
    });

    return {
      task: toTaskDTO(reopenedTask),
      progression: {
        level: progression.level,
        totalXp: progression.totalXp,
        currentLevelXp: progression.currentLevelXp,
        nextLevelXp: progression.nextLevelXp,
      },
    };
  });
}
