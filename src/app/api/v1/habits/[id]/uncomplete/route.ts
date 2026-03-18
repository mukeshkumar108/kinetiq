import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateJsonBody } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import { DomainError, uncompleteHabit } from "@/modules/completions/completions.service";
import { habitUncompletionBodySchema } from "@/modules/completions/completions.schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedBody = await validateJsonBody(request, habitUncompletionBodySchema);
  if (parsedBody.ok === false) return parsedBody.response;

  const resolvedParams = await params;

  try {
    const result = await uncompleteHabit(auth.context.user.id, resolvedParams.id, parsedBody.data);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.status, error.message, error.code);
    }

    return apiError(500, "failed to uncomplete habit", "HABIT_UNCOMPLETE_FAILED");
  }
}
