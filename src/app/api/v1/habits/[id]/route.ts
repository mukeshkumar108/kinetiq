import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateJsonBody } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import {
  deleteHabit,
  getHabitById,
  updateHabit,
} from "@/modules/habits/habits.service";
import { updateHabitSchema } from "@/modules/habits/habits.schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const resolvedParams = await params;

  try {
    const habit = await getHabitById(auth.context.user.id, resolvedParams.id);
    if (habit === null) {
      return apiError(404, "habit not found", "HABIT_NOT_FOUND");
    }

    return apiSuccess(habit);
  } catch {
    return apiError(500, "failed to get habit", "HABIT_GET_FAILED");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedBody = await validateJsonBody(request, updateHabitSchema);
  if (parsedBody.ok === false) return parsedBody.response;

  const resolvedParams = await params;

  try {
    const habit = await updateHabit(auth.context.user.id, resolvedParams.id, parsedBody.data);
    if (habit === null) {
      return apiError(404, "habit not found", "HABIT_NOT_FOUND");
    }

    return apiSuccess(habit);
  } catch {
    return apiError(500, "failed to update habit", "HABIT_UPDATE_FAILED");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const resolvedParams = await params;

  try {
    const deleted = await deleteHabit(auth.context.user.id, resolvedParams.id);
    if (deleted === null) {
      return apiError(404, "habit not found", "HABIT_NOT_FOUND");
    }

    return apiSuccess(deleted);
  } catch {
    return apiError(500, "failed to delete habit", "HABIT_DELETE_FAILED");
  }
}
