import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { completeHabit, completeTask, reopenTask, uncompleteHabit } from "@/modules/completions/completions.service";
import { grantXpTx, removeXpEntriesForReferenceTx } from "@/modules/progression/progression.service";

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
const grantXpTxMock = vi.mocked(grantXpTx);
const removeXpEntriesMock = vi.mocked(removeXpEntriesForReferenceTx);

describe("completions.service", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    grantXpTxMock.mockClear();
    removeXpEntriesMock.mockClear();
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

  it("uncomplete habit removes completion and XP projection", async () => {
    const tx = {
      habit: {
        findFirst: vi.fn(async () => ({ id: "habit_1", timezone: "UTC" })),
      },
      user: {
        findUnique: vi.fn(async () => ({ timezone: "UTC" })),
      },
      habitCompletion: {
        findUnique: vi.fn(async () => ({ id: "hc_1" })),
        delete: vi.fn(async () => undefined),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    const result = await uncompleteHabit("user_1", "habit_1", { timezone: "UTC" });

    expect(tx.habitCompletion.delete).toHaveBeenCalledWith({ where: { id: "hc_1" } });
    expect(removeXpEntriesMock).toHaveBeenCalled();
    expect(result.removedLocalDate).toBe("2026-03-18");
  });

  it("prevent completing archived or other-user habit", async () => {
    const tx = {
      habit: {
        findFirst: vi.fn(async () => null),
      },
      user: {
        findUnique: vi.fn(async () => ({ timezone: "UTC" })),
      },
      habitCompletion: {
        create: vi.fn(),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    await expect(completeHabit("user_1", "habit_2", { timezone: "UTC" })).rejects.toMatchObject({
      code: "HABIT_NOT_FOUND",
      status: 404,
    });
    expect(tx.habitCompletion.create).not.toHaveBeenCalled();
  });

  it("task completion grants XP", async () => {
    const now = new Date("2026-03-18T10:00:00.000Z");
    const tx = {
      task: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: vi.fn(async () => ({
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
    expect(tx.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "open" }) }),
    );
    expect(grantXpTxMock).toHaveBeenCalledTimes(1);
  });

  it("prevent double completion rewards", async () => {
    const now = new Date("2026-03-18T10:00:00.000Z");
    const tx = {
      task: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findFirst: vi.fn(async () => ({
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
      progressionProfile: {
        findUnique: vi.fn(async () => ({
          level: 1,
          totalXp: 10,
          currentLevelXp: 10,
          nextLevelXp: 100,
        })),
      },
    };

    transactionMock.mockImplementation(async (fn) => fn(tx as never));

    const result = await completeTask("user_1", "task_1");

    expect(result.grantedXp).toBe(0);
    expect(grantXpTxMock).not.toHaveBeenCalled();
  });

  it("reopen task revokes XP and prevents acting on other-user task", async () => {
    const now = new Date("2026-03-18T10:00:00.000Z");

    const txSuccess = {
      task: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: vi.fn(async () => ({
          id: "task_1",
          title: "Do it",
          description: null,
          dueAt: null,
          status: "open",
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        })),
      },
    };

    transactionMock.mockImplementationOnce(async (fn) => fn(txSuccess as never));
    const reopened = await reopenTask("user_1", "task_1");
    expect(reopened.task.status).toBe("open");
    expect(removeXpEntriesMock).toHaveBeenCalledTimes(1);

    const txMissing = {
      task: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        findFirst: vi.fn(async () => null),
      },
    };

    transactionMock.mockImplementationOnce(async (fn) => fn(txMissing as never));

    await expect(reopenTask("user_1", "task_2")).rejects.toMatchObject({
      code: "TASK_NOT_FOUND",
      status: 404,
    });
  });
});
