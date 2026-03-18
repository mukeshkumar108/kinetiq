import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { authGuard } from "@/lib/auth/auth-guard";
import { getProgression } from "@/modules/progression/progression.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  try {
    const progression = await getProgression(auth.context.user.id);
    return apiSuccess(progression);
  } catch {
    return apiError(500, "failed to get progression", "PROGRESSION_GET_FAILED");
  }
}
