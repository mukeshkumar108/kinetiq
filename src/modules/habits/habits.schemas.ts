import { z } from "zod";

const nullableTrimmed = (max: number) =>
  z.union([
    z.string().trim().max(max).transform((value) => (value === "" ? null : value)),
    z.null(),
  ]);

export const habitIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const listHabitsQuerySchema = z.object({
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
}).strict();

export const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: nullableTrimmed(500).optional(),
  color: nullableTrimmed(32).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
}).strict();

export const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: nullableTrimmed(500).optional(),
  color: nullableTrimmed(32).optional(),
  timezone: z.union([z.string().trim().min(1).max(64), z.null()]).optional(),
  isArchived: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;
