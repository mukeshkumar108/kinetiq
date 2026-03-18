import { Prisma } from "@prisma/client";

const oneDayMs = 24 * 60 * 60 * 1000;

function parseLocalDate(localDate: string) {
  return new Date(localDate + "T00:00:00.000Z");
}

function diffInDays(previous: string, next: string) {
  const prevTs = parseLocalDate(previous).getTime();
  const nextTs = parseLocalDate(next).getTime();
  return Math.round((nextTs - prevTs) / oneDayMs);
}

export function calculateStreak(localDates: string[]) {
  if (localDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedLocalDate: null as string | null,
    };
  }

  const sortedUniqueDates = Array.from(new Set(localDates)).sort();

  let longestStreak = 1;
  let running = 1;

  for (let i = 1; i < sortedUniqueDates.length; i += 1) {
    const gap = diffInDays(sortedUniqueDates[i - 1], sortedUniqueDates[i]);
    if (gap === 1) {
      running += 1;
    } else {
      running = 1;
    }

    if (running > longestStreak) longestStreak = running;
  }

  let currentStreak = 1;
  for (let i = sortedUniqueDates.length - 1; i > 0; i -= 1) {
    const gap = diffInDays(sortedUniqueDates[i - 1], sortedUniqueDates[i]);
    if (gap === 1) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastCompletedLocalDate: sortedUniqueDates[sortedUniqueDates.length - 1],
  };
}

export async function recomputeHabitStreakTx(
  tx: Prisma.TransactionClient,
  userId: string,
  habitId: string,
) {
  const completions = await tx.habitCompletion.findMany({
    where: { userId, habitId },
    select: { localDate: true },
    orderBy: { localDate: "asc" },
  });

  const streak = calculateStreak(completions.map((entry) => entry.localDate));

  return tx.habitStreak.upsert({
    where: { habitId },
    create: {
      userId,
      habitId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedLocalDate: streak.lastCompletedLocalDate,
    },
    update: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedLocalDate: streak.lastCompletedLocalDate,
    },
  });
}
