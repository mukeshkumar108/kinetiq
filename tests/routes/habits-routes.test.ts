import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth-guard", () => ({
  authGuard: vi.fn(async () => ({
    ok: true,
    context: { user: { id: "user_1", timezone: "UTC" } },
  })),
}));

vi.mock("@/modules/habits/habits.service", () => ({
  listHabits: vi.fn(async () => [{ id: "habit_1" }]),
  createHabit: vi.fn(async () => ({ id: "habit_1" })),
  getHabitById: vi.fn(async () => ({ id: "habit_1" })),
  updateHabit: vi.fn(async () => ({ id: "habit_1", title: "Updated" })),
  deleteHabit: vi.fn(async () => ({ id: "habit_1" })),
}));

vi.mock("@/modules/completions/completions.service", () => {
  class DomainError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return {
    DomainError,
    completeHabit: vi.fn(async () => ({ habitId: "habit_1" })),
    uncompleteHabit: vi.fn(async () => ({ habitId: "habit_1" })),
  };
});

import { GET as listHabitsGET, POST as createHabitsPOST } from "@/app/api/v1/habits/route";
import {
  DELETE as deleteHabitDELETE,
  GET as getHabitGET,
  PATCH as patchHabitPATCH,
} from "@/app/api/v1/habits/[id]/route";
import { POST as completeHabitPOST } from "@/app/api/v1/habits/[id]/complete/route";
import { POST as uncompleteHabitPOST } from "@/app/api/v1/habits/[id]/uncomplete/route";
import { completeHabit, DomainError, uncompleteHabit } from "@/modules/completions/completions.service";
import { createHabit, deleteHabit, getHabitById, listHabits, updateHabit } from "@/modules/habits/habits.service";

const listHabitsMock = vi.mocked(listHabits);
const createHabitMock = vi.mocked(createHabit);
const getHabitByIdMock = vi.mocked(getHabitById);
const updateHabitMock = vi.mocked(updateHabit);
const deleteHabitMock = vi.mocked(deleteHabit);
const completeHabitMock = vi.mocked(completeHabit);
const uncompleteHabitMock = vi.mocked(uncompleteHabit);

describe("habits routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/habits", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits", {
      method: "POST",
      body: JSON.stringify({ title: "Drink water" }),
    });

    const res = await createHabitsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "habit_1" } });
    expect(createHabitMock).toHaveBeenCalled();
  });

  it("GET /api/v1/habits", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits");
    const res = await listHabitsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: [{ id: "habit_1" }] });
    expect(listHabitsMock).toHaveBeenCalled();
  });

  it("GET /api/v1/habits/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits/habit_1");
    const res = await getHabitGET(req, { params: Promise.resolve({ id: "habit_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "habit_1" } });
  });

  it("PATCH /api/v1/habits/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits/habit_1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await patchHabitPATCH(req, { params: Promise.resolve({ id: "habit_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "habit_1" } });
    expect(updateHabitMock).toHaveBeenCalled();
  });

  it("DELETE /api/v1/habits/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits/habit_1", {
      method: "DELETE",
    });
    const res = await deleteHabitDELETE(req, { params: Promise.resolve({ id: "habit_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "habit_1" } });
    expect(deleteHabitMock).toHaveBeenCalled();
  });

  it("POST /api/v1/habits/:id/complete", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits/habit_1/complete", {
      method: "POST",
      body: JSON.stringify({ timezone: "UTC" }),
    });

    const res = await completeHabitPOST(req, { params: Promise.resolve({ id: "habit_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { habitId: "habit_1" } });
    expect(completeHabitMock).toHaveBeenCalled();
  });

  it("POST /api/v1/habits/:id/uncomplete", async () => {
    const req = new NextRequest("https://example.com/api/v1/habits/habit_1/uncomplete", {
      method: "POST",
      body: JSON.stringify({ timezone: "UTC" }),
    });

    const res = await uncompleteHabitPOST(req, { params: Promise.resolve({ id: "habit_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { habitId: "habit_1" } });
    expect(uncompleteHabitMock).toHaveBeenCalled();
  });

  it("maps domain errors on completion routes", async () => {
    completeHabitMock.mockRejectedValueOnce(new DomainError(404, "HABIT_NOT_FOUND", "habit not found"));

    const req = new NextRequest("https://example.com/api/v1/habits/habit_404/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await completeHabitPOST(req, { params: Promise.resolve({ id: "habit_404" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      data: null,
      error: { code: "HABIT_NOT_FOUND" },
    });
  });

  it("returns not found for foreign/missing habit in CRUD", async () => {
    getHabitByIdMock.mockResolvedValueOnce(null);
    const req = new NextRequest("https://example.com/api/v1/habits/other");
    const res = await getHabitGET(req, { params: Promise.resolve({ id: "other" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, data: null, error: { code: "HABIT_NOT_FOUND" } });
  });

  it("returns not found for update/delete when habit is not owned", async () => {
    updateHabitMock.mockResolvedValueOnce(null);
    deleteHabitMock.mockResolvedValueOnce(null);

    const patchReq = new NextRequest("https://example.com/api/v1/habits/other", {
      method: "PATCH",
      body: JSON.stringify({ title: "Nope" }),
    });
    const patchRes = await patchHabitPATCH(patchReq, { params: Promise.resolve({ id: "other" }) });
    const patchBody = await patchRes.json();
    expect(patchRes.status).toBe(404);
    expect(patchBody).toMatchObject({ success: false, data: null, error: { code: "HABIT_NOT_FOUND" } });

    const deleteReq = new NextRequest("https://example.com/api/v1/habits/other", {
      method: "DELETE",
    });
    const deleteRes = await deleteHabitDELETE(deleteReq, { params: Promise.resolve({ id: "other" }) });
    const deleteBody = await deleteRes.json();
    expect(deleteRes.status).toBe(404);
    expect(deleteBody).toMatchObject({ success: false, data: null, error: { code: "HABIT_NOT_FOUND" } });
  });
});
