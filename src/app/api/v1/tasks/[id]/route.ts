import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateJsonBody } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import {
  deleteTask,
  getTaskById,
  updateTask,
} from "@/modules/tasks/tasks.service";
import { updateTaskSchema } from "@/modules/tasks/tasks.schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const resolvedParams = await params;

  try {
    const task = await getTaskById(auth.context.user.id, resolvedParams.id);
    if (task === null) {
      return apiError(404, "task not found", "TASK_NOT_FOUND");
    }

    return apiSuccess(task);
  } catch {
    return apiError(500, "failed to get task", "TASK_GET_FAILED");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedBody = await validateJsonBody(request, updateTaskSchema);
  if (parsedBody.ok === false) return parsedBody.response;

  const resolvedParams = await params;

  try {
    const task = await updateTask(auth.context.user.id, resolvedParams.id, parsedBody.data);
    if (task === null) {
      return apiError(404, "task not found", "TASK_NOT_FOUND");
    }

    return apiSuccess(task);
  } catch {
    return apiError(500, "failed to update task", "TASK_UPDATE_FAILED");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const resolvedParams = await params;

  try {
    const deleted = await deleteTask(auth.context.user.id, resolvedParams.id);
    if (deleted === null) {
      return apiError(404, "task not found", "TASK_NOT_FOUND");
    }

    return apiSuccess(deleted);
  } catch {
    return apiError(500, "failed to delete task", "TASK_DELETE_FAILED");
  }
}
