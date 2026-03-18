import { Task } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.schemas";

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "open" | "completed";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTaskDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt?.toISOString() ?? null,
    status: task.status,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function listTasks(userId: string, query: ListTasksQuery) {
  const statusFilter =
    query.status && query.status !== "all"
      ? query.status
      : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: statusFilter,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return tasks.map(toTaskDTO);
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });

  return toTaskDTO(task);
}

export async function getTaskById(userId: string, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, userId },
  });

  if (!task) return null;
  return toTaskDTO(task);
}

export async function updateTask(userId: string, id: string, input: UpdateTaskInput) {
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : input.dueAt,
    },
  });

  return toTaskDTO(task);
}

export async function deleteTask(userId: string, id: string) {
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await prisma.task.delete({ where: { id: existing.id } });
  return { id: existing.id };
}
