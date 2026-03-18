import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { completeHabit, completeTask } from "@/modules/completions/completions.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/modules/achievements/achievements.service", () => ({
  seedAchievementDefinitions: vi.fn(async () => undefined),
  evaluateAchievementsTx: vi.fn(async () => []),
}));

vi.mock("@/modules/streaks/streaks.service", () => ({
  recomputeHabitStreakTx: vi.fn(async () => ({
    currentStreak: 2,
    longestStreak: 4,
    lastCompletedLocalDate: "2026-03-18",
  })),
}));

vi.mock("@/modules/progression/progression.service", () => ({
  HABIT_COMPLETION_XP: 10,
  TASK_COMPLETION_XP: 25,
  getLocalDateKey: vi.fn(() => "2026-03-18"),
  grantXpTx: vi.fn(async () => ({
    level: 1,
    totalXp: 25,
    currentLevelXp: 25,
    nextLevelXp: 100,
  })),
  removeXpEntriesForReferenceTx: vi.fn(async () => ({
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    nextLevelXp: 100,
  })),
}));

vi.mock("@/modules/tasks/tasks.service", () => ({
  toTaskDTO: vi.fn((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    status: task.status,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  })),
}));

const transactionMock = vi.mocked(prisma.$transaction);

describe("completions.service", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("completing a habit creates completion and progression payload", async () => {
    const tx = {
      habit: {
        findFirst: vi.fn(async () => ({ id: "habit_1", timezone: "UTC" })),
      },
      user: {
        findUnique: vi.fn(async () => ({ timezone: "UTC" })),
      },
      habitCompletion: {
        create: vi.fn(async () => ({
          id: "hc_1",
          localDate: "2026-03-18",
          timezone: "UTC",
          completedAt: new Date("2026-03-18T10:00:00.000Z"),
        })),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    const result = await completeHabit("user_1", "habit_1", { timezone: "UTC" });

    expect(tx.habitCompletion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          habitId: "habit_1",
          localDate: "2026-03-18",
        }),
      }),
    );
    expect(result.completion.localDate).toBe("2026-03-18");
    expect(result.streak.current).toBe(2);
  });

  it("duplicate habit completion is prevented", async () => {
    const tx = {
      habit: {
        findFirst: vi.fn(async () => ({ id: "habit_1", timezone: "UTC" })),
      },
      user: {
        findUnique: vi.fn(async () => ({ timezone: "UTC" })),
      },
      habitCompletion: {
        create: vi.fn(async () => {
          throw { code: "P2002" };
        }),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    await expect(completeHabit("user_1", "habit_1", { timezone: "UTC" })).rejects.toMatchObject({
      code: "HABIT_ALREADY_COMPLETED",
      status: 409,
    });
  });

  it("task completion grants XP", async () => {
    const now = new Date("2026-03-18T10:00:00.000Z");
    const tx = {
      task: {
        findFirst: vi.fn(async () => ({
          id: "task_1",
          title: "Do it",
          description: null,
          dueAt: null,
          status: "open",
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        })),
        update: vi.fn(async () => ({
          id: "task_1",
          title: "Do it",
          description: null,
          dueAt: null,
          status: "completed",
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        })),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    const result = await completeTask("user_1", "task_1");

    expect(result.grantedXp).toBe(25);
    expect(tx.task.update).toHaveBeenCalled();
    expect(result.task.status).toBe("completed");
  });
});
