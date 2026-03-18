import { Habit, HabitStreak } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CreateHabitInput,
  ListHabitsQuery,
  UpdateHabitInput,
} from "./habits.schemas";

export type HabitDTO = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  timezone: string | null;
  frequency: "daily";
  isArchived: boolean;
  streak: {
    current: number;
    longest: number;
    lastCompletedLocalDate: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

function toHabitDTO(habit: Habit & { streak: HabitStreak | null }): HabitDTO {
  return {
    id: habit.id,
    title: habit.title,
    description: habit.description,
    color: habit.color,
    timezone: habit.timezone,
    frequency: habit.frequency,
    isArchived: habit.isArchived,
    streak: {
      current: habit.streak?.currentStreak ?? 0,
      longest: habit.streak?.longestStreak ?? 0,
      lastCompletedLocalDate: habit.streak?.lastCompletedLocalDate ?? null,
    },
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}

export async function listHabits(userId: string, query: ListHabitsQuery) {
  const habits = await prisma.habit.findMany({
    where: {
      userId,
      isArchived: query.includeArchived ? undefined : false,
    },
    include: { streak: true },
    orderBy: { createdAt: "asc" },
  });

  return habits.map(toHabitDTO);
}

export async function createHabit(userId: string, input: CreateHabitInput) {
  const habit = await prisma.habit.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      color: input.color,
      timezone: input.timezone,
    },
    include: { streak: true },
  });

  return toHabitDTO(habit);
}

export async function getHabitById(userId: string, id: string) {
  const habit = await prisma.habit.findFirst({
    where: { id, userId },
    include: { streak: true },
  });

  if (!habit) return null;
  return toHabitDTO(habit);
}

export async function updateHabit(userId: string, id: string, input: UpdateHabitInput) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const habit = await prisma.habit.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      color: input.color,
      timezone: input.timezone,
      isArchived: input.isArchived,
    },
    include: { streak: true },
  });

  return toHabitDTO(habit);
}

export async function deleteHabit(userId: string, id: string) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await prisma.habit.delete({ where: { id: existing.id } });
  return { id: existing.id };
}
