import { z } from "zod";

const localDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const habitCompletionBodySchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
  localDate: z.string().regex(localDateRegex).optional(),
}).strict();

export const habitUncompletionBodySchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
  localDate: z.string().regex(localDateRegex).optional(),
}).strict();

export type HabitCompletionBody = z.infer<typeof habitCompletionBodySchema>;
export type HabitUncompletionBody = z.infer<typeof habitUncompletionBodySchema>;
