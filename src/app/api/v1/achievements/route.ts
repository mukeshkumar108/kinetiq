import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { authGuard } from "@/lib/auth/auth-guard";
import { listAchievements } from "@/modules/achievements/achievements.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authGuard(request);
  if (auth.ok === false) return auth.response;

  try {
    const achievements = await listAchievements(auth.context.user.id);
    return apiSuccess(achievements);
  } catch {
    return apiError(500, "failed to list achievements", "ACHIEVEMENTS_LIST_FAILED");
  }
}
