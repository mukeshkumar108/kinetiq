import { describe, expect, it } from "vitest";
import { calculateStreak } from "@/modules/streaks/streaks.service";

describe("streaks.calculateStreak", () => {
  it("calculates current and longest streak", () => {
    const streak = calculateStreak([
      "2026-03-10",
      "2026-03-11",
      "2026-03-13",
      "2026-03-14",
      "2026-03-15",
    ]);

    expect(streak).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedLocalDate: "2026-03-15",
    });
  });
});
