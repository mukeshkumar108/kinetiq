import { describe, expect, it, vi } from "vitest";
import { evaluateAchievementsTx } from "@/modules/achievements/achievements.service";

describe("achievements evaluate idempotency", () => {
  it("does not unlock the same achievement twice", async () => {
    const createMock = vi.fn(async () => undefined);

    const tx = {
      achievementDefinition: {
        findMany: vi.fn(async ({ where }: { where?: { id?: { in: string[] } } }) => {
          if (where?.id?.in) {
            return [
              {
                id: "a1",
                code: "habit_streak_3",
                title: "Consistency Begins",
              },
            ];
          }

          return [
            {
              id: "a1",
              code: "habit_streak_3",
              title: "Consistency Begins",
              description: "Reach a 3-day habit streak",
              metric: "longest_habit_streak",
              threshold: 3,
              active: true,
            },
          ];
        }),
      },
      userAchievement: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ achievementDefinitionId: "a1" }]),
        create: createMock,
      },
      habitStreak: {
        aggregate: vi.fn(async () => ({ _max: { longestStreak: 5 } })),
      },
      habitCompletion: {
        count: vi.fn(async () => 20),
      },
      xpLedgerEntry: {
        count: vi.fn(async () => 20),
        aggregate: vi.fn(async () => ({ _sum: { amount: 500 } })),
      },
    };

    const first = await evaluateAchievementsTx(tx as never, "user_1");
    const second = await evaluateAchievementsTx(tx as never, "user_1");

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
