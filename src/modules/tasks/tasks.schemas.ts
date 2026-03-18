import { z } from "zod";

const nullableTrimmed = (max: number) =>
  z.union([
    z.string().trim().max(max).transform((value) => (value === "" ? null : value)),
    z.null(),
  ]);

const isoDateSchema = z.string().datetime({ offset: true });

export const taskIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(["open", "completed", "all"]).optional(),
}).strict();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: nullableTrimmed(500).optional(),
  dueAt: z.union([isoDateSchema, z.null()]).optional(),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: nullableTrimmed(500).optional(),
  dueAt: z.union([isoDateSchema, z.null()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
