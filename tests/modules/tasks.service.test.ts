import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "@/modules/tasks/tasks.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const taskMock = prisma.task;

const baseTask = {
  id: "task_1",
  userId: "user_1",
  title: "Read",
  description: null,
  dueAt: null,
  status: "open",
  completedAt: null,
  createdAt: new Date("2026-03-18T00:00:00.000Z"),
  updatedAt: new Date("2026-03-18T00:00:00.000Z"),
};

describe("tasks.service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates task for current user", async () => {
    vi.mocked(taskMock.create).mockResolvedValueOnce(baseTask as never);

    await createTask("user_1", { title: "Read" });

    expect(taskMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user_1", title: "Read" }),
      }),
    );
  });

  it("lists tasks scoped to user", async () => {
    vi.mocked(taskMock.findMany).mockResolvedValueOnce([baseTask] as never);

    await listTasks("user_1", { status: "all" });

    expect(taskMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user_1" }),
      }),
    );
  });

  it("gets task by id with ownership", async () => {
    vi.mocked(taskMock.findFirst).mockResolvedValueOnce(baseTask as never);

    const found = await getTaskById("user_1", "task_1");

    expect(taskMock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "task_1", userId: "user_1" } }),
    );
    expect(found?.id).toBe("task_1");
  });

  it("returns null when updating other-user task", async () => {
    vi.mocked(taskMock.findFirst).mockResolvedValueOnce(null);

    const result = await updateTask("user_1", "task_2", { title: "Updated" });

    expect(result).toBeNull();
    expect(taskMock.update).not.toHaveBeenCalled();
  });

  it("deletes own task", async () => {
    vi.mocked(taskMock.findFirst).mockResolvedValueOnce(baseTask as never);

    const deleted = await deleteTask("user_1", "task_1");

    expect(deleted).toEqual({ id: "task_1" });
    expect(taskMock.delete).toHaveBeenCalledWith({ where: { id: "task_1" } });
  });
});
