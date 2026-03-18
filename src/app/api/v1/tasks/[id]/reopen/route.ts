import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { authGuard } from "@/lib/auth/auth-guard";
import { DomainError, reopenTask } from "@/modules/completions/completions.service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const resolvedParams = await params;

  try {
    const result = await reopenTask(auth.context.user.id, resolvedParams.id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.status, error.message, error.code);
    }

    return apiError(500, "failed to reopen task", "TASK_REOPEN_FAILED");
  }
}
