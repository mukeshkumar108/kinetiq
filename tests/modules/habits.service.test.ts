import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHabit,
  deleteHabit,
  getHabitById,
  listHabits,
  updateHabit,
} from "@/modules/habits/habits.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    habit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const habitMock = prisma.habit;

const baseHabit = {
  id: "habit_1",
  userId: "user_1",
  title: "Drink water",
  description: null,
  color: null,
  timezone: "UTC",
  frequency: "daily",
  isArchived: false,
  createdAt: new Date("2026-03-18T00:00:00.000Z"),
  updatedAt: new Date("2026-03-18T00:00:00.000Z"),
  streak: null,
};

describe("habits.service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates habit for current user", async () => {
    vi.mocked(habitMock.create).mockResolvedValueOnce(baseHabit as never);

    await createHabit("user_1", { title: "Drink water" });

    expect(habitMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user_1", title: "Drink water" }),
      }),
    );
  });

  it("lists habits scoped to user", async () => {
    vi.mocked(habitMock.findMany).mockResolvedValueOnce([baseHabit] as never);

    await listHabits("user_1", {});

    expect(habitMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user_1" }),
      }),
    );
  });

  it("gets habit by id with ownership", async () => {
    vi.mocked(habitMock.findFirst).mockResolvedValueOnce(baseHabit as never);

    const found = await getHabitById("user_1", "habit_1");

    expect(habitMock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "habit_1", userId: "user_1" } }),
    );
    expect(found?.id).toBe("habit_1");
  });

  it("returns null when updating other-user habit", async () => {
    vi.mocked(habitMock.findFirst).mockResolvedValueOnce(null);

    const result = await updateHabit("user_1", "habit_2", { title: "Updated" });

    expect(result).toBeNull();
    expect(habitMock.update).not.toHaveBeenCalled();
  });

  it("deletes own habit and blocks missing/other-user", async () => {
    vi.mocked(habitMock.findFirst).mockResolvedValueOnce(baseHabit as never);

    const deleted = await deleteHabit("user_1", "habit_1");

    expect(deleted).toEqual({ id: "habit_1" });
    expect(habitMock.delete).toHaveBeenCalledWith({ where: { id: "habit_1" } });
  });
});
