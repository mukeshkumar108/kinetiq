import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth-guard", () => ({
  authGuard: vi.fn(async () => ({
    ok: true,
    context: { user: { id: "user_1", timezone: "Europe/London" } },
  })),
}));

vi.mock("@/modules/progression/progression.service", () => ({
  getProgression: vi.fn(async () => ({ level: 2, totalXp: 150, currentLevelXp: 50, nextLevelXp: 100 })),
  getTodaySnapshot: vi.fn(async () => ({ date: "2026-03-18", timezone: "Europe/London", habits: [], tasks: [] })),
}));

vi.mock("@/modules/achievements/achievements.service", () => ({
  listAchievements: vi.fn(async () => []),
}));

import { GET as getProgressionGET } from "@/app/api/v1/progression/route";
import { GET as getAchievementsGET } from "@/app/api/v1/achievements/route";
import { GET as getTodayGET } from "@/app/api/v1/today/route";
import { getTodaySnapshot } from "@/modules/progression/progression.service";

describe("progression/achievements/today routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/progression", async () => {
    const req = new NextRequest("https://example.com/api/v1/progression");
    const res = await getProgressionGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      error: null,
      data: { level: 2, totalXp: 150 },
    });
  });

  it("GET /api/v1/achievements", async () => {
    const req = new NextRequest("https://example.com/api/v1/achievements");
    const res = await getAchievementsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: [] });
  });

  it("GET /api/v1/today", async () => {
    const req = new NextRequest("https://example.com/api/v1/today");
    const res = await getTodayGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      error: null,
      data: { date: "2026-03-18", timezone: "Europe/London" },
    });

    expect(getTodaySnapshot).toHaveBeenCalledWith("user_1", "Europe/London");
  });

  it("GET /api/v1/today with explicit timezone", async () => {
    const req = new NextRequest("https://example.com/api/v1/today?timezone=America/New_York");
    await getTodayGET(req);
    expect(getTodaySnapshot).toHaveBeenCalledWith("user_1", "America/New_York");
  });
});
