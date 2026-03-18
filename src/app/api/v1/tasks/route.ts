import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateJsonBody, validateQuery } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import { createTask, listTasks } from "@/modules/tasks/tasks.service";
import { createTaskSchema, listTasksQuerySchema } from "@/modules/tasks/tasks.schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedQuery = validateQuery(
    listTasksQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (parsedQuery.ok === false) return parsedQuery.response;

  try {
    const tasks = await listTasks(auth.context.user.id, parsedQuery.data);
    return apiSuccess(tasks);
  } catch {
    return apiError(500, "failed to list tasks", "TASKS_LIST_FAILED");
  }
}

export async function POST(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedBody = await validateJsonBody(request, createTaskSchema);
  if (parsedBody.ok === false) return parsedBody.response;

  try {
    const task = await createTask(auth.context.user.id, parsedBody.data);
    return apiSuccess(task, 201);
  } catch {
    return apiError(500, "failed to create task", "TASK_CREATE_FAILED");
  }
}
