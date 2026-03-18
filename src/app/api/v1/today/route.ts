import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateQuery } from "@/lib/api/validation";
import { authGuard } from "@/lib/auth/auth-guard";
import { getTodaySnapshot } from "@/modules/progression/progression.service";
import { todayQuerySchema } from "@/modules/progression/progression.schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  const parsedQuery = validateQuery(
    todayQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (parsedQuery.ok === false) return parsedQuery.response;

  try {
    const timezone =
      parsedQuery.data.timezone ??
      auth.context.user.timezone ??
      "UTC";

    const snapshot = await getTodaySnapshot(auth.context.user.id, timezone);
    return apiSuccess(snapshot);
  } catch {
    return apiError(500, "failed to get today snapshot", "TODAY_GET_FAILED");
  }
}
