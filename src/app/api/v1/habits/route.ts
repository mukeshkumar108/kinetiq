import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateJsonBody, validateQuery } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import {
  createHabit,
  listHabits,
} from "@/modules/habits/habits.service";
import {
  createHabitSchema,
  listHabitsQuerySchema,
} from "@/modules/habits/habits.schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedQuery = validateQuery(
    listHabitsQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (parsedQuery.ok === false) return parsedQuery.response;

  try {
    const habits = await listHabits(auth.context.user.id, parsedQuery.data);
    return apiSuccess(habits);
  } catch {
    return apiError(500, "failed to list habits", "HABITS_LIST_FAILED");
  }
}

export async function POST(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedBody = await validateJsonBody(request, createHabitSchema);
  if (parsedBody.ok === false) return parsedBody.response;

  try {
    const habit = await createHabit(auth.context.user.id, parsedBody.data);
    return apiSuccess(habit, 201);
  } catch {
    return apiError(500, "failed to create habit", "HABIT_CREATE_FAILED");
  }
}
