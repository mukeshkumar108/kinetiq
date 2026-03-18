import { z } from "zod";

export const todayQuerySchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
}).strict();

export type TodayQuery = z.infer<typeof todayQuerySchema>;
